import { beforeEach, describe, expect, it } from "vitest";
import {
  getMergeDemoConfig,
  isMergeDemoConfigured,
} from "../config";
import {
  deriveMergeOriginUserId,
  openMergeUserHandle,
  sealMergeUserHandle,
} from "../identity";
import {
  RateLimiter,
  isTrustedOrigin,
  secureJson,
} from "../http";

const validEnv = (
  overrides: Record<string, string | undefined> = {}
): Record<string, string | undefined> => ({
  AUTH_SECRET: "a".repeat(32),
  AUTH_GOOGLE_ID: "google-client-id",
  AUTH_GOOGLE_SECRET: "google-client-secret",
  MERGE_AGENT_HANDLER_KEY: "merge-key",
  MERGE_TOOL_PACK_ID: "tool-pack-id",
  MERGE_USER_ID_SECRET: "u".repeat(32),
  ...overrides,
});

beforeEach(() => {
  delete process.env.MERGE_AGENT_HANDLER_BASE_URL;
});

describe("Merge demo configuration", () => {
  it("requires every secret needed by the live integration", () => {
    expect(isMergeDemoConfigured({})).toBe(false);
    expect(() => getMergeDemoConfig({})).toThrow("not configured");

    for (const key of [
      "AUTH_SECRET",
      "AUTH_GOOGLE_ID",
      "AUTH_GOOGLE_SECRET",
      "MERGE_AGENT_HANDLER_KEY",
      "MERGE_TOOL_PACK_ID",
      "MERGE_USER_ID_SECRET",
    ]) {
      expect(
        isMergeDemoConfigured(validEnv({ [key]: undefined })),
        key
      ).toBe(false);
    }
  });

  it("accepts a complete configuration and uses the safe default base URL", () => {
    const config = getMergeDemoConfig(validEnv());

    expect(config.agentHandlerBaseUrl).toBe("https://ah-api.merge.dev");
    expect(config.calendarToolName).toBeUndefined();
  });

  it("rejects non-HTTPS base URLs", () => {
    expect(() =>
      getMergeDemoConfig(
        validEnv({ MERGE_AGENT_HANDLER_BASE_URL: "http://attacker.test" })
      )
    ).toThrow("HTTPS");
  });

  it("reports invalid secrets and overrides as not configured", () => {
    expect(
      isMergeDemoConfigured(validEnv({ AUTH_SECRET: "too-short" }))
    ).toBe(false);
    expect(
      isMergeDemoConfigured(
        validEnv({ MERGE_CALENDAR_TOOL_NAME: "calendar__delete_event" })
      )
    ).toBe(false);
    expect(
      isMergeDemoConfigured(validEnv({ NEXTAUTH_URL: "not-a-url" }))
    ).toBe(false);
    expect(
      isMergeDemoConfigured(
        validEnv({ NEXTAUTH_URL: "http://public.example" })
      )
    ).toBe(false);
  });

  it.each([
    "list_events",
    "google-calendar__list_events",
    "google_calendar__list_events",
  ])("accepts the allow-listed Calendar tool name %s", (name) => {
    expect(
      getMergeDemoConfig(validEnv({ MERGE_CALENDAR_TOOL_NAME: name }))
        .calendarToolName
    ).toBe(name);
  });

  it.each([
    "slack__list_events",
    "outlook__list_events",
    "google-calendar__delete_event",
    "../../../list_events",
  ])("rejects unsafe Calendar tool override %s", (name) => {
    expect(() =>
      getMergeDemoConfig(validEnv({ MERGE_CALENDAR_TOOL_NAME: name }))
    ).toThrow("Calendar tool");
  });
});

describe("Merge user identity", () => {
  it("is deterministic, namespaced, and never contains the Google subject", () => {
    const subject = "google-user-123";
    const first = deriveMergeOriginUserId(subject, "s".repeat(32));
    const second = deriveMergeOriginUserId(subject, "s".repeat(32));

    expect(first).toBe(second);
    expect(first).toMatch(/^shepard_[a-f0-9]{64}$/);
    expect(first).not.toContain(subject);
  });

  it("changes when either the provider subject or secret changes", () => {
    const base = deriveMergeOriginUserId("user-a", "a".repeat(32));

    expect(deriveMergeOriginUserId("user-b", "a".repeat(32))).not.toBe(base);
    expect(deriveMergeOriginUserId("user-a", "b".repeat(32))).not.toBe(base);
  });

  it("rejects empty subjects and weak secrets", () => {
    expect(() => deriveMergeOriginUserId("", "a".repeat(32))).toThrow(
      "provider subject"
    );
    expect(() => deriveMergeOriginUserId("user", "short")).toThrow(
      "at least 32"
    );
  });

  it("round-trips an encrypted, user-bound Merge handle", () => {
    const secret = "s".repeat(32);
    const sealed = sealMergeUserHandle(
      "registered-user-id",
      "shepard_origin",
      secret,
      1_000
    );

    expect(sealed).not.toContain("registered-user-id");
    expect(
      openMergeUserHandle(sealed, "shepard_origin", secret, 2_000)
    ).toBe("registered-user-id");
    expect(
      openMergeUserHandle(sealed, "different-user", secret, 2_000)
    ).toBeUndefined();
    expect(
      openMergeUserHandle(sealed, "shepard_origin", secret, 30_000_001)
    ).toBeUndefined();
  });

  it("rejects a tampered Merge handle", () => {
    const secret = "s".repeat(32);
    const sealed = sealMergeUserHandle(
      "registered-user-id",
      "shepard_origin",
      secret
    );
    const parts = sealed.split(".");
    parts[2] = `${parts[2].startsWith("a") ? "b" : "a"}${parts[2].slice(1)}`;
    const tampered = parts.join(".");

    expect(
      openMergeUserHandle(tampered, "shepard_origin", secret)
    ).toBeUndefined();
  });
});

describe("request security", () => {
  it("accepts only same-origin mutation requests in production", () => {
    const sameOrigin = new Request("https://shepard.example/api/merge-demo/profile", {
      method: "POST",
      headers: { Origin: "https://shepard.example" },
    });
    const foreign = new Request("https://shepard.example/api/merge-demo/profile", {
      method: "POST",
      headers: { Origin: "https://attacker.example" },
    });
    const missing = new Request("https://shepard.example/api/merge-demo/profile", {
      method: "POST",
    });

    expect(isTrustedOrigin(sameOrigin, true)).toBe(true);
    expect(isTrustedOrigin(foreign, true)).toBe(false);
    expect(isTrustedOrigin(missing, true)).toBe(false);
    expect(isTrustedOrigin(missing, false)).toBe(true);
  });

  it("uses the configured public origin behind a TLS-terminating proxy", () => {
    const proxied = new Request(
      "http://127.0.0.1:3000/api/merge-demo/profile",
      {
        method: "POST",
        headers: { Origin: "https://shepard.example" },
      }
    );

    expect(
      isTrustedOrigin(proxied, true, "https://shepard.example")
    ).toBe(true);
    expect(
      isTrustedOrigin(proxied, true, "https://attacker.example")
    ).toBe(false);
  });

  it("enforces a fixed per-user window and returns a retry delay", () => {
    const limiter = new RateLimiter(10);
    const policy = { limit: 2, windowMs: 1_000 };

    expect(limiter.consume("user", policy, 10_000)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    expect(limiter.consume("user", policy, 10_100).allowed).toBe(true);
    expect(limiter.consume("user", policy, 10_200)).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
    });
    expect(limiter.consume("user", policy, 11_001).allowed).toBe(true);
  });

  it("bounds rate-limit memory", () => {
    const limiter = new RateLimiter(2);
    const policy = { limit: 1, windowMs: 60_000 };

    limiter.consume("a", policy, 0);
    limiter.consume("b", policy, 1);
    limiter.consume("c", policy, 2);

    expect(limiter.size).toBe(2);
  });

  it("creates no-store JSON responses without server details", async () => {
    const response = secureJson({ error: "upstream_error" }, 502, {
      "Retry-After": "5",
    });

    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, max-age=0"
    );
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Retry-After")).toBe("5");
    expect(await response.json()).toEqual({ error: "upstream_error" });
  });
});
