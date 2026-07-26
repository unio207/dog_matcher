import { describe, expect, it, vi } from "vitest";
import type { MergeDemoConfig } from "../config";
import {
  MAX_EVENTS,
  MergeDemoClient,
  MergeDemoUpstreamError,
} from "../client";

const config: MergeDemoConfig = {
  authSecret: "a".repeat(32),
  googleClientId: "google-id",
  googleClientSecret: "google-secret",
  agentHandlerKey: "merge-super-secret",
  toolPackId: "tool-pack",
  userIdSecret: "u".repeat(32),
  agentHandlerBaseUrl: "https://ah-api.merge.dev",
};

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });

const event = (start: string, attendees = 0) => ({
  start: { dateTime: start },
  end: { dateTime: new Date(Date.parse(start) + 3_600_000).toISOString() },
  attendees: Array.from({ length: attendees }, (_, index) => ({
    email: `private-${index}@example.com`,
  })),
  summary: "Private meeting title",
  description: "Private event description",
  location: "Private location",
});

function mcpToolResult(events: unknown[]) {
  return json({
    jsonrpc: "2.0",
    id: "call",
    result: {
      content: [
        {
          type: "text",
          text: JSON.stringify({ items: events }),
        },
      ],
    },
  });
}

describe("MergeDemoClient management plane", () => {
  it("creates an isolated user and a connector-locked single-use Link token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ id: "registered-user-secret" }))
      .mockResolvedValueOnce(json({ link_token: "link-token" }, { status: 201 }));
    const client = new MergeDemoClient(config, fetchMock as typeof fetch);

    await expect(
      client.createCalendarLinkToken("shepard_pseudonym")
    ).resolves.toEqual({
      linkToken: "link-token",
      registeredUserId: "registered-user-secret",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [createUrl, createInit] = fetchMock.mock.calls[0];
    expect(createUrl).toBe("https://ah-api.merge.dev/api/v1/registered-users/");
    expect(JSON.parse(String(createInit?.body))).toEqual({
      origin_user_id: "shepard_pseudonym",
      origin_user_name: "Shepard user",
      user_type: "HUMAN",
    });
    expect(createInit?.cache).toBe("no-store");

    const [linkUrl, linkInit] = fetchMock.mock.calls[1];
    expect(linkUrl).toBe(
      "https://ah-api.merge.dev/api/v1/registered-users/registered-user-secret/link-token/"
    );
    expect(JSON.parse(String(linkInit?.body))).toEqual({
      connector: "google-calendar",
    });
    expect(new Headers(linkInit?.headers).get("Idempotency-Key")).toMatch(
      /^[0-9a-f-]{36}$/
    );

    const serializedCalls = JSON.stringify(fetchMock.mock.calls);
    expect(serializedCalls).toContain("merge-super-secret");
  });

  it("does not include upstream bodies, credentials, or identifiers in errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "merge-super-secret registered-user-secret private payload",
        }),
        { status: 401 }
      )
    );
    const client = new MergeDemoClient(config, fetchMock as typeof fetch);

    const error = await client
      .createCalendarLinkToken("shepard_pseudonym")
      .catch((caught) => caught);

    expect(error).toBeInstanceOf(MergeDemoUpstreamError);
    expect(String(error)).not.toContain("merge-super-secret");
    expect(String(error)).not.toContain("registered-user-secret");
    expect(String(error)).not.toContain("private payload");
  });

  it("stops reading an upstream body as soon as it crosses the 1 MiB cap", async () => {
    let reads = 0;
    const chunk = new Uint8Array(600_000);
    const reader = {
      read: vi.fn(async () => {
        reads += 1;
        return reads > 3
          ? { done: true, value: undefined }
          : { done: false, value: chunk };
      }),
      cancel: vi.fn(async () => undefined),
    };
    const response = {
      status: 200,
      headers: new Headers({ "Content-Type": "application/json" }),
      body: { getReader: () => reader },
      text: vi.fn(async () => {
        reads = 3;
        return "x".repeat(1_800_000);
      }),
    } as unknown as Response;
    const fetchMock = vi.fn().mockResolvedValue(response);
    const client = new MergeDemoClient(config, fetchMock as typeof fetch);

    await expect(
      client.createCalendarLinkToken("shepard_pseudonym")
    ).rejects.toBeInstanceOf(MergeDemoUpstreamError);
    expect(reads).toBe(2);
    expect(reader.cancel).toHaveBeenCalledOnce();
    expect(response.text).not.toHaveBeenCalled();
  });

  it("accepts the legacy registered_user_id response field", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ registered_user_id: "legacy-id" }))
      .mockResolvedValueOnce(json({ link_token: "link-token" }, { status: 201 }));
    const client = new MergeDemoClient(config, fetchMock as typeof fetch);

    await expect(
      client.createCalendarLinkToken("shepard_pseudonym")
    ).resolves.toEqual({
      linkToken: "link-token",
      registeredUserId: "legacy-id",
    });
    expect(String(fetchMock.mock.calls[1][0])).toContain("/legacy-id/link-token/");
  });

  it("treats an already-absent registered user as deleted", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const client = new MergeDemoClient(config, fetchMock as typeof fetch);

    await expect(
      client.deleteRegisteredUser("registered-user")
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });
});

describe("MergeDemoClient MCP data plane", () => {
  it("returns bounded live Calendar aggregates and synthetic Slack/Drive signals", async () => {
    const now = Date.parse("2026-07-26T12:00:00.000Z");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json(
          {
            jsonrpc: "2.0",
            id: 1,
            result: { protocolVersion: "2024-11-05" },
          },
          { headers: { "Mcp-Session-Id": "rotated-session-id" } }
        )
      )
      .mockResolvedValueOnce(
        json({
          jsonrpc: "2.0",
          id: "list",
          result: {
            tools: [{ name: "google-calendar__list_events" }],
          },
        })
      )
      .mockResolvedValueOnce(
        mcpToolResult([
          event("2026-07-20T09:00:00.000Z", 3),
          event("2026-07-21T14:00:00.000Z", 1),
        ])
      );
    const client = new MergeDemoClient(
      config,
      fetchMock as typeof fetch,
      () => now
    );

    const profile = await client.getLiveProfile("registered-user-secret");

    expect(profile.personaId).toBe("merge-calendar-live");
    expect(profile.connectors).toEqual([
      "google-calendar",
      "slack-sample",
      "drive-sample",
    ]);
    for (const key of [
      "meetingDensity",
      "timeOfDaySpread",
      "weekendLoad",
      "longestFreeBlock",
      "travelGaps",
      "groupEventRatio",
    ] as const) {
      expect(profile.signals[key].synthetic, key).toBe(false);
    }
    expect(profile.signals.messageVolume.synthetic).toBe(true);
    expect(profile.signals.afterHoursActivity.synthetic).toBe(true);
    expect(profile.signals.fileActivity.synthetic).toBe(true);

    const resultText = JSON.stringify(profile);
    expect(resultText).not.toContain("Private meeting title");
    expect(resultText).not.toContain("private-0@example.com");
    expect(resultText).not.toContain("registered-user-secret");
    expect(resultText).not.toContain("merge-super-secret");

    const callBody = JSON.parse(
      String(fetchMock.mock.calls[2][1]?.body)
    ) as {
      params: { name: string; arguments: Record<string, unknown> };
    };
    expect(callBody.params.name).toBe("google-calendar__list_events");
    expect(callBody.params.arguments).toMatchObject({
      calendarId: "primary",
      timeMin: "2026-06-26T12:00:00.000Z",
      timeMax: "2026-07-26T12:00:00.000Z",
      singleEvents: true,
      orderBy: "startTime",
      maxResults: MAX_EVENTS,
    });
    expect(callBody).toMatchObject({ jsonrpc: "2.0", id: 3 });
    const initializeBody = JSON.parse(
      String(fetchMock.mock.calls[0][1]?.body)
    ) as Record<string, unknown>;
    expect(initializeBody).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05" },
    });
    expect(
      new Headers(fetchMock.mock.calls[0][1]?.headers).get("Mcp-Session-Id")
    ).toMatch(/^[0-9a-f-]{36}$/);
    expect(
      new Headers(fetchMock.mock.calls[1][1]?.headers).get("Mcp-Session-Id")
    ).toBe("rotated-session-id");
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "?format=json&connectors=google-calendar"
    );
    expect(String(fetchMock.mock.calls[2][0])).toContain(
      "?format=json&connectors=google-calendar"
    );
  });

  it.each([
    "slack__list_events",
    "outlook__list_events",
    "google-calendar__delete_event",
  ])("rejects discovered non-Calendar tool %s", async (toolName) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({ result: { protocolVersion: "2024-11-05" } })
      )
      .mockResolvedValueOnce(
        json({
          result: { tools: [{ name: toolName }] },
        })
      );
    const client = new MergeDemoClient(config, fetchMock as typeof fetch);

    await expect(
      client.getLiveProfile("registered-user")
    ).rejects.toBeInstanceOf(MergeDemoUpstreamError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects more than 250 returned events", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({ result: { protocolVersion: "2024-11-05" } })
      )
      .mockResolvedValueOnce(
        json({
          result: { tools: [{ name: "list_events" }] },
        })
      )
      .mockResolvedValueOnce(
        mcpToolResult(
          Array.from({ length: MAX_EVENTS + 1 }, (_, index) =>
            event(
              new Date(Date.UTC(2026, 6, 1) + index * 60_000).toISOString()
            )
          )
        )
      );
    const client = new MergeDemoClient(config, fetchMock as typeof fetch);

    await expect(
      client.getLiveProfile("registered-user")
    ).rejects.toBeInstanceOf(MergeDemoUpstreamError);
  });

  it("rejects malformed MCP content instead of returning fixtures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({ result: { protocolVersion: "2024-11-05" } })
      )
      .mockResolvedValueOnce(
        json({
          result: { tools: [{ name: "list_events" }] },
        })
      )
      .mockResolvedValueOnce(
        json({
          result: { content: [{ type: "text", text: "not-json" }] },
        })
      );
    const client = new MergeDemoClient(config, fetchMock as typeof fetch);

    await expect(
      client.getLiveProfile("registered-user")
    ).rejects.toBeInstanceOf(MergeDemoUpstreamError);
  });
});
