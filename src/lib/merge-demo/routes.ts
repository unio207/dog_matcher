import type { RawMergeData } from "@/types";
import {
  getMergeDemoConfig,
  isMergeDemoConfigured,
  type MergeDemoConfig,
} from "./config";
import {
  MergeDemoClient,
  MergeDemoUpstreamError,
} from "./client";
import {
  deriveMergeOriginUserId,
  openMergeUserHandle,
  sealMergeUserHandle,
} from "./identity";
import {
  RateLimiter,
  isTrustedOrigin,
  secureJson,
  secureNoContent,
  type RateLimitPolicy,
} from "./http";

export type MergeDemoAction = "link-token" | "profile" | "account";

export interface MergeDemoClientLike {
  createCalendarLinkToken(originUserId: string): Promise<{
    linkToken: string;
    registeredUserId: string;
  }>;
  getLiveProfile(registeredUserId: string): Promise<RawMergeData>;
  deleteRegisteredUser(registeredUserId: string): Promise<void>;
}

export interface MergeDemoRouteDependencies {
  env: Record<string, string | undefined>;
  production: boolean;
  limiter: RateLimiter;
  getProviderSub(request: Request): Promise<string | undefined>;
  createClient(config: MergeDemoConfig): MergeDemoClientLike;
}

const POLICIES: Record<MergeDemoAction, RateLimitPolicy> = {
  "link-token": { limit: 5, windowMs: 60_000 },
  profile: { limit: 10, windowMs: 60_000 },
  account: { limit: 2, windowMs: 60 * 60_000 },
};
const HANDLE_COOKIE = "__Host-shepard-merge-handle";
const HANDLE_MAX_AGE_SECONDS = 8 * 60 * 60;

function readCookie(request: Request, name: string): string | undefined {
  const cookies = request.headers.get("Cookie")?.split(";") ?? [];
  for (const rawCookie of cookies) {
    const [rawName, ...rawValue] = rawCookie.trim().split("=");
    if (rawName === name) return rawValue.join("=") || undefined;
  }
  return undefined;
}

function handleCookie(value: string, maxAge = HANDLE_MAX_AGE_SECONDS): string {
  return `${HANDLE_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function handleMergeDemoRoute(
  action: MergeDemoAction,
  request: Request,
  dependencies: MergeDemoRouteDependencies
): Promise<Response> {
  if (
    !isTrustedOrigin(
      request,
      dependencies.production,
      dependencies.env.NEXTAUTH_URL
    )
  ) {
    return secureJson({ error: "forbidden" }, 403);
  }
  if (!isMergeDemoConfigured(dependencies.env)) {
    return secureJson({ error: "not_configured" }, 503);
  }

  let providerSub: string | undefined;
  try {
    providerSub = await dependencies.getProviderSub(request);
  } catch {
    return secureJson({ error: "unauthorized" }, 401);
  }
  if (!providerSub) {
    return secureJson({ error: "unauthorized" }, 401);
  }

  try {
    const config = getMergeDemoConfig(dependencies.env);
    const originUserId = deriveMergeOriginUserId(
      providerSub,
      config.userIdSecret
    );
    const rateLimit = dependencies.limiter.consume(
      `${action}:${originUserId}`,
      POLICIES[action]
    );
    if (!rateLimit.allowed) {
      return secureJson(
        { error: "rate_limited" },
        429,
        { "Retry-After": String(rateLimit.retryAfterSeconds) }
      );
    }

    if (action === "link-token") {
      const client = dependencies.createClient(config);
      const { linkToken, registeredUserId } =
        await client.createCalendarLinkToken(originUserId);
      const response = secureJson({ linkToken });
      response.headers.set(
        "Set-Cookie",
        handleCookie(
          sealMergeUserHandle(
            registeredUserId,
            originUserId,
            config.userIdSecret
          )
        )
      );
      return response;
    }

    const registeredUserId = openMergeUserHandle(
      readCookie(request, HANDLE_COOKIE) ?? "",
      originUserId,
      config.userIdSecret
    );
    if (!registeredUserId) {
      return secureJson({ error: "connection_required" }, 409);
    }
    const client = dependencies.createClient(config);
    if (action === "profile") {
      return secureJson(await client.getLiveProfile(registeredUserId));
    }

    await client.deleteRegisteredUser(registeredUserId);
    return secureNoContent(204, {
      "Set-Cookie": handleCookie("", 0),
    });
  } catch (error) {
    if (error instanceof MergeDemoUpstreamError) {
      return secureJson({ error: "upstream_error" }, 502);
    }
    return secureJson({ error: "upstream_error" }, 502);
  }
}

export const mergeDemoRateLimiter = new RateLimiter();

export function createMergeDemoClient(config: MergeDemoConfig) {
  return new MergeDemoClient(config);
}
