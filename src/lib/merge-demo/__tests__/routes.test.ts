import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RawMergeData } from "@/types";
import { RateLimiter } from "../http";
import {
  handleMergeDemoRoute,
  type MergeDemoClientLike,
  type MergeDemoRouteDependencies,
} from "../routes";
import { MergeDemoUpstreamError } from "../client";

const env: Record<string, string> = {
  AUTH_SECRET: "a".repeat(32),
  AUTH_GOOGLE_ID: "google-id",
  AUTH_GOOGLE_SECRET: "google-secret",
  MERGE_AGENT_HANDLER_KEY: "merge-secret",
  MERGE_TOOL_PACK_ID: "tool-pack",
  MERGE_USER_ID_SECRET: "u".repeat(32),
  NEXTAUTH_URL: "https://shepard.example",
};

const profile: RawMergeData = {
  personaId: "merge-calendar-live",
  connectors: ["google-calendar", "slack-sample", "drive-sample"],
  signals: {
    meetingDensity: { value: 0.2, raw: "6 meetings/week", synthetic: false },
    timeOfDaySpread: { value: 0.3, raw: "active 9:00–14:00", synthetic: false },
    weekendLoad: { value: 0.1, raw: "1 weekend event", synthetic: false },
    longestFreeBlock: { value: 0.9, raw: "longest free block: 43h", synthetic: false },
    travelGaps: { value: 0, raw: "0 multi-day blocks", synthetic: false },
    groupEventRatio: { value: 0.7, raw: "70% group events", synthetic: false },
    messageVolume: { value: 0.28, raw: "Slack sample", synthetic: true },
    afterHoursActivity: { value: 0.05, raw: "Slack sample", synthetic: true },
    fileActivity: { value: 0.3, raw: "Drive sample", synthetic: true },
  },
};

function request(
  path: string,
  method = "POST",
  origin = "https://shepard.example"
) {
  return new Request(`https://shepard.example${path}`, {
    method,
    headers: origin ? { Origin: origin } : {},
  });
}

function dependencies(
  clientOverrides: Partial<MergeDemoClientLike> = {},
  overrides: Partial<MergeDemoRouteDependencies> = {}
): MergeDemoRouteDependencies {
  const client: MergeDemoClientLike = {
    createCalendarLinkToken: vi.fn().mockResolvedValue({
      linkToken: "link-token",
      registeredUserId: "registered-user-id",
    }),
    getLiveProfile: vi.fn().mockResolvedValue(profile),
    deleteRegisteredUser: vi.fn().mockResolvedValue(undefined),
    ...clientOverrides,
  };
  return {
    env,
    production: true,
    limiter: new RateLimiter(),
    getProviderSub: vi.fn().mockResolvedValue("google-subject"),
    createClient: vi.fn(() => client),
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Merge demo route security", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await handleMergeDemoRoute(
      "profile",
      request("/api/merge-demo/profile"),
      dependencies({}, { getProviderSub: vi.fn().mockResolvedValue(undefined) })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("rejects foreign and missing production origins", async () => {
    const foreign = await handleMergeDemoRoute(
      "profile",
      request(
        "/api/merge-demo/profile",
        "POST",
        "https://attacker.example"
      ),
      dependencies()
    );
    const missing = await handleMergeDemoRoute(
      "profile",
      request("/api/merge-demo/profile", "POST", ""),
      dependencies()
    );

    expect(foreign.status).toBe(403);
    expect(missing.status).toBe(403);
  });

  it("returns only a generic setup state when configuration is missing", async () => {
    const response = await handleMergeDemoRoute(
      "profile",
      request("/api/merge-demo/profile"),
      dependencies({}, { env: {} })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "not_configured" });
  });

  it("rate-limits repeated per-user Link requests", async () => {
    const deps = dependencies();
    const responses: Response[] = [];
    for (let index = 0; index < 6; index++) {
      responses.push(
        await handleMergeDemoRoute(
          "link-token",
          request("/api/merge-demo/link-token"),
          deps
        )
      );
    }

    expect(responses.slice(0, 5).every((response) => response.status === 200)).toBe(
      true
    );
    expect(responses[5].status).toBe(429);
    expect(responses[5].headers.get("Retry-After")).toBeTruthy();
  });
});

describe("Merge demo route actions", () => {
  it("returns only the short-lived Link token", async () => {
    const deps = dependencies();
    const response = await handleMergeDemoRoute(
      "link-token",
      request("/api/merge-demo/link-token"),
      deps
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ linkToken: "link-token" });
    const headers = Object.fromEntries(response.headers);
    expect(JSON.stringify(headers)).not.toContain("merge-secret");
    expect(headers["set-cookie"]).toContain("__Host-shepard-merge-handle=");
    expect(headers["set-cookie"]).toContain("HttpOnly");
    expect(headers["set-cookie"]).toContain("Secure");
    expect(headers["set-cookie"]).not.toContain("registered-user-id");
  });

  it("returns the aggregate profile with no-store headers", async () => {
    const linkResponse = await handleMergeDemoRoute(
      "link-token",
      request("/api/merge-demo/link-token"),
      dependencies()
    );
    const cookie = linkResponse.headers.get("Set-Cookie")!.split(";")[0];
    const response = await handleMergeDemoRoute(
      "profile",
      new Request("https://shepard.example/api/merge-demo/profile", {
        method: "POST",
        headers: {
          Origin: "https://shepard.example",
          Cookie: cookie,
        },
      }),
      dependencies()
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(await response.json()).toEqual(profile);
  });

  it("deletes the signed-in user's Merge account", async () => {
    const linkResponse = await handleMergeDemoRoute(
      "link-token",
      request("/api/merge-demo/link-token"),
      dependencies()
    );
    const cookie = linkResponse.headers.get("Set-Cookie")!.split(";")[0];
    const response = await handleMergeDemoRoute(
      "account",
      new Request("https://shepard.example/api/merge-demo/account", {
        method: "DELETE",
        headers: {
          Origin: "https://shepard.example",
          Cookie: cookie,
        },
      }),
      dependencies()
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("requires a valid encrypted handle for profile and deletion", async () => {
    const deps = dependencies();
    const profileResponse = await handleMergeDemoRoute(
      "profile",
      request("/api/merge-demo/profile"),
      deps
    );
    const deleteResponse = await handleMergeDemoRoute(
      "account",
      request("/api/merge-demo/account", "DELETE"),
      deps
    );

    expect(profileResponse.status).toBe(409);
    expect(deleteResponse.status).toBe(409);
    expect(deps.createClient).not.toHaveBeenCalled();
  });

  it("maps upstream details to a generic safe error", async () => {
    const linkResponse = await handleMergeDemoRoute(
      "link-token",
      request("/api/merge-demo/link-token"),
      dependencies()
    );
    const cookie = linkResponse.headers.get("Set-Cookie")!.split(";")[0];
    const response = await handleMergeDemoRoute(
      "profile",
      new Request("https://shepard.example/api/merge-demo/profile", {
        method: "POST",
        headers: {
          Origin: "https://shepard.example",
          Cookie: cookie,
        },
      }),
      dependencies({
        getLiveProfile: vi
          .fn()
          .mockRejectedValue(
            new MergeDemoUpstreamError()
          ),
      })
    );

    expect(response.status).toBe(502);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ error: "upstream_error" });
    expect(body).not.toContain("merge-secret");
  });
});
