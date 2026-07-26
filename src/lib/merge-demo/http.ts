export interface RateLimitPolicy {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();

  constructor(private readonly maxEntries = 1_000) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new Error("maxEntries must be a positive integer");
    }
  }

  get size(): number {
    return this.entries.size;
  }

  consume(
    key: string,
    policy: RateLimitPolicy,
    now = Date.now()
  ): RateLimitResult {
    if (!key || policy.limit < 1 || policy.windowMs < 1) {
      throw new Error("Invalid rate-limit input");
    }

    this.prune(now);
    const existing = this.entries.get(key);
    if (!existing || now >= existing.resetAt) {
      this.ensureCapacity();
      this.entries.set(key, {
        count: 1,
        resetAt: now + policy.windowMs,
      });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (existing.count >= policy.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((existing.resetAt - now) / 1_000)
        ),
      };
    }

    existing.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private prune(now: number) {
    for (const [key, entry] of this.entries) {
      if (now >= entry.resetAt) this.entries.delete(key);
    }
  }

  private ensureCapacity() {
    while (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.entries.delete(oldestKey);
    }
  }
}

export function isTrustedOrigin(
  request: Request,
  production = process.env.NODE_ENV === "production",
  publicOrigin?: string
): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return !production;

  try {
    const expectedOrigin = publicOrigin
      ? new URL(publicOrigin).origin
      : new URL(request.url).origin;
    if (
      production &&
      new URL(expectedOrigin).protocol !== "https:" &&
      new URL(expectedOrigin).hostname !== "localhost"
    ) {
      return false;
    }
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

export function secureJson(
  body: unknown,
  status = 200,
  extraHeaders: HeadersInit = {}
): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(JSON.stringify(body), { status, headers });
}

export function secureNoContent(
  status = 204,
  extraHeaders: HeadersInit = {}
): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(null, {
    status,
    headers,
  });
}
