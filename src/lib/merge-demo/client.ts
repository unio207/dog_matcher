import { randomUUID } from "node:crypto";
import { personas } from "@/data/fixtures/personas";
import {
  normalizeCalendarSignals,
  type CalEvent,
} from "@/lib/merge/live";
import type { RawMergeData } from "@/types";
import {
  isAllowedCalendarTool,
  type MergeDemoConfig,
} from "./config";

const TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 1_048_576;
const WINDOW_DAYS = 30;
export const MAX_EVENTS = 250;

type Fetch = typeof fetch;
type JsonObject = Record<string, unknown>;
type McpSession = {
  id: string;
  requestId: number;
};

export class MergeDemoUpstreamError extends Error {
  constructor() {
    super("Merge Agent Handler request failed");
    this.name = "MergeDemoUpstreamError";
  }
}

function asObject(value: unknown): JsonObject | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function stringField(object: JsonObject | undefined, key: string) {
  const value = object?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function sanitizeEvent(value: unknown): CalEvent | undefined {
  const event = asObject(value);
  const rawStart = asObject(event?.start);
  const rawEnd = asObject(event?.end);
  const startDateTime = stringField(rawStart, "dateTime");
  const startDate = stringField(rawStart, "date");
  if (!startDateTime && !startDate) return undefined;

  const endDateTime = stringField(rawEnd, "dateTime");
  const endDate = stringField(rawEnd, "date");
  const rawAttendees = Array.isArray(event?.attendees)
    ? event.attendees.length
    : 0;
  const attendeeCount = Math.min(rawAttendees, 500);

  return {
    start: {
      ...(startDateTime ? { dateTime: startDateTime } : {}),
      ...(startDate ? { date: startDate } : {}),
    },
    end: {
      ...(endDateTime ? { dateTime: endDateTime } : {}),
      ...(endDate ? { date: endDate } : {}),
    },
    attendees: new Array(attendeeCount),
  };
}

async function readBoundedBody(response: Response): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new MergeDemoUpstreamError();
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof MergeDemoUpstreamError) throw error;
    throw new MergeDemoUpstreamError();
  }

  const combined = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

export class MergeDemoClient {
  constructor(
    private readonly config: MergeDemoConfig,
    private readonly fetchImpl: Fetch = fetch,
    private readonly now: () => number = Date.now
  ) {}

  async createCalendarLinkToken(originUserId: string): Promise<{
    linkToken: string;
    registeredUserId: string;
  }> {
    const registeredUserId = await this.ensureRegisteredUser(originUserId);
    const payload = await this.requestJson(
      `/api/v1/registered-users/${encodeURIComponent(
        registeredUserId
      )}/link-token/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": randomUUID(),
        },
        body: JSON.stringify({ connector: "google-calendar" }),
      },
      [200, 201]
    );
    const linkToken = stringField(asObject(payload), "link_token");
    if (!linkToken) throw new MergeDemoUpstreamError();
    return { linkToken, registeredUserId };
  }

  async getLiveProfile(registeredUserId: string): Promise<RawMergeData> {
    const session: McpSession = { id: randomUUID(), requestId: 0 };
    await this.mcp(registeredUserId, session, "initialize", {
      protocolVersion: "2024-11-05",
    });
    const toolName =
      this.config.calendarToolName ??
      (await this.resolveCalendarTool(registeredUserId, session));
    if (!isAllowedCalendarTool(toolName)) {
      throw new MergeDemoUpstreamError();
    }

    const now = this.now();
    const result = await this.mcp(registeredUserId, session, "tools/call", {
      name: toolName,
      arguments: {
        calendarId: "primary",
        timeMin: new Date(now - WINDOW_DAYS * 86_400_000).toISOString(),
        timeMax: new Date(now).toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: MAX_EVENTS,
      },
    });
    const events = this.extractEvents(result);
    const calendar = normalizeCalendarSignals(events, WINDOW_DAYS);
    const sample = personas.homebody.signals;

    return {
      personaId: "merge-calendar-live",
      connectors: [
        "google-calendar",
        "slack-sample",
        "drive-sample",
      ],
      signals: {
        ...calendar,
        messageVolume: sample.messageVolume,
        afterHoursActivity: sample.afterHoursActivity,
        fileActivity: sample.fileActivity,
      },
    };
  }

  async deleteRegisteredUser(registeredUserId: string): Promise<void> {
    await this.requestText(
      `/api/v1/registered-users/${encodeURIComponent(registeredUserId)}/`,
      { method: "DELETE" },
      [200, 202, 204, 404]
    );
  }

  private async ensureRegisteredUser(originUserId: string): Promise<string> {
    const payload = await this.requestJson(
      "/api/v1/registered-users/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_user_id: originUserId,
          origin_user_name: "Shepard user",
          user_type: "HUMAN",
        }),
      },
      [200, 201, 409]
    );
    const object = asObject(payload);
    const registeredUserId =
      stringField(object, "id") ??
      stringField(object, "registered_user_id");
    if (!registeredUserId) throw new MergeDemoUpstreamError();
    return registeredUserId;
  }

  private async resolveCalendarTool(
    registeredUserId: string,
    session: McpSession
  ): Promise<string> {
    const result = await this.mcp(registeredUserId, session, "tools/list");
    const tools = Array.isArray(result.tools) ? result.tools : [];
    const names = tools
      .map((tool) => stringField(asObject(tool), "name"))
      .filter((name): name is string => Boolean(name));
    const matches = names.filter(isAllowedCalendarTool);
    if (matches.length !== 1) throw new MergeDemoUpstreamError();
    return matches[0];
  }

  private async mcp(
    registeredUserId: string,
    session: McpSession,
    method: "initialize" | "tools/list" | "tools/call",
    params?: unknown
  ): Promise<JsonObject> {
    session.requestId += 1;
    const payload = await this.requestJson(
      `/api/v1/tool-packs/${encodeURIComponent(
        this.config.toolPackId
      )}/registered-users/${encodeURIComponent(
        registeredUserId
      )}/mcp/?format=json&connectors=google-calendar`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "Mcp-Session-Id": session.id,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: session.requestId,
          method,
          ...(params === undefined ? {} : { params }),
        }),
      },
      [200],
      (response) => {
        const rotatedSessionId = response.headers.get("Mcp-Session-Id");
        if (rotatedSessionId) session.id = rotatedSessionId;
      }
    );
    const envelope = asObject(payload);
    if (!envelope || envelope.error) throw new MergeDemoUpstreamError();
    const result = asObject(envelope.result);
    if (!result) throw new MergeDemoUpstreamError();
    return result;
  }

  private extractEvents(result: JsonObject): CalEvent[] {
    const content = Array.isArray(result.content) ? result.content : [];
    for (const blockValue of content) {
      const block = asObject(blockValue);
      const text = stringField(block, "text");
      if (!text || text.length > MAX_RESPONSE_BYTES) continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        continue;
      }
      const object = asObject(parsed);
      const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray(object?.items)
          ? object.items
          : Array.isArray(object?.events)
            ? object.events
            : undefined;
      if (!items || items.length > MAX_EVENTS) {
        throw new MergeDemoUpstreamError();
      }
      return items
        .map(sanitizeEvent)
        .filter((item): item is CalEvent => Boolean(item));
    }
    throw new MergeDemoUpstreamError();
  }

  private async requestJson(
    path: string,
    init: RequestInit,
    allowedStatuses: number[],
    onResponse?: (response: Response) => void
  ): Promise<unknown> {
    const text = await this.requestText(
      path,
      init,
      allowedStatuses,
      onResponse
    );
    if (!text) throw new MergeDemoUpstreamError();
    try {
      return JSON.parse(text);
    } catch {
      throw new MergeDemoUpstreamError();
    }
  }

  private async requestText(
    path: string,
    init: RequestInit,
    allowedStatuses: number[],
    onResponse?: (response: Response) => void
  ): Promise<string> {
    let response: Response;
    try {
      response = await this.fetchImpl(
        `${this.config.agentHandlerBaseUrl}${path}`,
        {
          ...init,
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${this.config.agentHandlerKey}`,
            Accept: "application/json",
            ...init.headers,
          },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }
      );
    } catch {
      throw new MergeDemoUpstreamError();
    }

    if (!allowedStatuses.includes(response.status)) {
      throw new MergeDemoUpstreamError();
    }
    const declaredLength = Number(response.headers.get("Content-Length") ?? 0);
    if (declaredLength > MAX_RESPONSE_BYTES) {
      throw new MergeDemoUpstreamError();
    }
    onResponse?.(response);

    return readBoundedBody(response);
  }
}
