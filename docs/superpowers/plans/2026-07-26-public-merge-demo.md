# Public Merge Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure, separate `/merge-demo` page with Google sign-in and per-user Google Calendar linking through Merge Agent Handler while leaving `/` unchanged.

**Architecture:** Auth.js stores the Google provider subject only inside its encrypted JWT. Server-only helpers pseudonymize that subject, create a per-user Merge Registered User, mint connector-locked Link tokens, and reduce bounded Calendar event responses into the existing aggregate signal model. Thin route handlers enforce authentication, same-origin requests, rate limits, generic errors, and no-store responses.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, NextAuth 4.24.15, `@mergeapi/react-agent-handler-link` 0.0.6, Vitest 4.

## Global Constraints

- The existing `/` page and `/api/profile` behavior do not change.
- Only Google Calendar is live; Slack and Drive stay visibly synthetic.
- Raw event data, Google subject IDs, Merge Registered User IDs, MCP URLs, and secrets never reach browser responses or logs.
- Live mode fails closed; fixture fallback is explicit and user-selected.
- Every upstream request is HTTPS, bounded, timed out, and sent with `cache: "no-store"`.

---

### Task 1: Authentication and configuration boundary

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/merge-demo/config.ts`
- Create: `src/lib/merge-demo/identity.ts`
- Create: `src/lib/merge-demo/__tests__/security.test.ts`
- Create: `src/types/next-auth.d.ts`
- Create: `src/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

**Interfaces:**
- Produces: `getMergeDemoConfig(env): MergeDemoConfig`, `isMergeDemoConfigured(env): boolean`, `deriveMergeOriginUserId(providerSub, secret): string`, and `authOptions`.

- [ ] **Step 1: Install compatible dependencies**

Run:

```bash
npm install next-auth@4.24.15 @mergeapi/react-agent-handler-link@0.0.6
```

- [ ] **Step 2: Write failing configuration and identity tests**

Test that all six required variables are required, override URLs must be HTTPS,
Calendar tool overrides must be allow-listed, HMAC output is deterministic, and
the raw Google subject does not appear in the result:

```ts
expect(() => getMergeDemoConfig({})).toThrow("not configured");
expect(() =>
  getMergeDemoConfig(validEnv({ MERGE_AGENT_HANDLER_BASE_URL: "http://evil.test" }))
).toThrow("HTTPS");
expect(deriveMergeOriginUserId("google-subject", "a".repeat(32))).toMatch(
  /^shepard_[a-f0-9]{64}$/
);
expect(deriveMergeOriginUserId("google-subject", "a".repeat(32))).not.toContain(
  "google-subject"
);
```

- [ ] **Step 3: Run the focused test and confirm RED**

Run: `npm test -- src/lib/merge-demo/__tests__/security.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 4: Implement configuration, HMAC identity, and Auth.js**

`config.ts` validates exact required variables, minimum 32-character secrets,
an HTTPS Agent Handler base URL, and the fixed Calendar tool-name allow-list.
`identity.ts` uses Node `createHmac("sha256", secret)`.

`src/auth.ts` configures Google, JWT sessions, and this callback:

```ts
async jwt({ token, account }) {
  if (account?.provider === "google" && account.providerAccountId) {
    token.googleProviderSub = account.providerAccountId;
  }
  return token;
}
```

The session callback must not copy `googleProviderSub` into the browser-visible
session.

- [ ] **Step 5: Run the focused test and confirm GREEN**

Run: `npm test -- src/lib/merge-demo/__tests__/security.test.ts`

Expected: PASS.

### Task 2: Request security helpers

**Files:**
- Create: `src/lib/merge-demo/http.ts`
- Modify: `src/lib/merge-demo/__tests__/security.test.ts`

**Interfaces:**
- Produces: `isTrustedOrigin(request, production): boolean`,
  `consumeRateLimit(key, policy, now): RateLimitResult`, and
  `secureJson(body, status, headers?): Response`.

- [ ] **Step 1: Add failing origin, rate-limit, and response-header tests**

Cover matching origin, foreign origin, missing production origin, bounded
per-user windows, `Retry-After`, `Cache-Control: no-store`, and JSON types.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- src/lib/merge-demo/__tests__/security.test.ts`

Expected: FAIL on missing request-security exports.

- [ ] **Step 3: Implement minimal security helpers**

Use an in-memory map capped at 1,000 entries, delete expired entries before
eviction, and return only safe JSON bodies.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npm test -- src/lib/merge-demo/__tests__/security.test.ts`

Expected: PASS.

### Task 3: Bounded Merge Agent Handler client

**Files:**
- Create: `src/lib/merge-demo/client.ts`
- Create: `src/lib/merge-demo/__tests__/client.test.ts`
- Modify: `src/lib/merge/live.ts`

**Interfaces:**
- Consumes: `MergeDemoConfig`, `deriveMergeOriginUserId`, and existing
  `normalizeCalendarSignals(events, windowDays)`.
- Produces: `MergeDemoClient` with `createCalendarLinkToken(originUserId,
  displayName)`, `getLiveProfile(originUserId, displayName)`, and
  `deleteRegisteredUser(originUserId, displayName)`.

- [ ] **Step 1: Write failing management-plane tests**

Use a fake `fetch` to assert:

```ts
expect(createUserRequest.body).toEqual({
  origin_user_id: pseudonym,
  origin_user_name: "Shepard user",
  user_type: "HUMAN",
});
expect(linkRequest.body).toEqual({ connector: "google-calendar" });
expect(JSON.stringify(result)).not.toContain(apiKey);
expect(JSON.stringify(result)).not.toContain(registeredUserId);
```

Also cover non-2xx responses, oversized bodies, timeouts, and deletion 404 as a
successful end state.

- [ ] **Step 2: Run the client test and confirm RED**

Run: `npm test -- src/lib/merge-demo/__tests__/client.test.ts`

Expected: FAIL because `MergeDemoClient` does not exist.

- [ ] **Step 3: Implement registered-user, Link-token, and deletion calls**

Accept documented registered-user response IDs from `id` and the legacy
`registered_user_id` field, but never return either from public methods. Generate
a fresh UUID idempotency key for each Link token request.

- [ ] **Step 4: Write failing MCP and profile tests**

Assert `tools/list` discovery allows only `list_events`,
`google-calendar__list_events`, or `google_calendar__list_events`; the call uses
a server-generated 30-day window and `maxResults: 250`; 251 events fail; malformed
blocks fail; Calendar signals are non-synthetic; Slack and Drive signals remain
synthetic.

- [ ] **Step 5: Run the client test and confirm RED**

Run: `npm test -- src/lib/merge-demo/__tests__/client.test.ts`

Expected: FAIL on the unimplemented MCP profile path.

- [ ] **Step 6: Implement the bounded MCP profile path**

Parse at most a 1 MiB JSON-RPC body and at most 250 events. Extract only
`start`, `end`, all-day state, and attendee array length before calling
`normalizeCalendarSignals`.

- [ ] **Step 7: Run client tests and confirm GREEN**

Run: `npm test -- src/lib/merge-demo/__tests__/client.test.ts`

Expected: PASS.

### Task 4: Authenticated API routes

**Files:**
- Create: `src/lib/merge-demo/routes.ts`
- Create: `src/lib/merge-demo/__tests__/routes.test.ts`
- Create: `src/app/api/merge-demo/link-token/route.ts`
- Create: `src/app/api/merge-demo/profile/route.ts`
- Create: `src/app/api/merge-demo/account/route.ts`

**Interfaces:**
- Consumes: Auth.js `getToken`, request-security helpers, and
  `MergeDemoClient`.
- Produces: POST Link-token/profile routes and a DELETE account route.

- [ ] **Step 1: Write failing route-service tests**

Cover `401` without `googleProviderSub`, `403` foreign/missing production origin,
`429` repeated calls, `503 not_configured`, generic `502 upstream_error`, safe
Link token output, `RawMergeData` output, and `204` deletion.

- [ ] **Step 2: Run route tests and confirm RED**

Run: `npm test -- src/lib/merge-demo/__tests__/routes.test.ts`

Expected: FAIL because the route service does not exist.

- [ ] **Step 3: Implement injectable route services and thin Next.js handlers**

The handlers resolve the JWT server-side, pass only the provider subject and a
constant display name to the service, and never accept connector names or user
IDs from request bodies.

- [ ] **Step 4: Run route tests and confirm GREEN**

Run: `npm test -- src/lib/merge-demo/__tests__/routes.test.ts`

Expected: PASS.

### Task 5: Separate page and security headers

**Files:**
- Create: `src/app/merge-demo/page.tsx`
- Create: `src/components/MergeDemoClient.tsx`
- Modify: `src/app/globals.css`
- Modify: `next.config.ts`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: Auth.js session state, `/api/merge-demo/*`, and
  `useAgentHandlerLink`.
- Produces: a self-contained `/merge-demo` UI with configured, signed-out,
  signed-in, linking, connected, loading, results, error, and deleted states.

- [ ] **Step 1: Add an unconfigured-page test**

Extend route/config tests to prove missing secrets return a non-sensitive setup
state and never expose which individual secret is missing to a public response.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- src/lib/merge-demo/__tests__/routes.test.ts`

Expected: FAIL until the public setup-state helper exists.

- [ ] **Step 3: Build the separate page**

Render the server-owned configured/sign-in state. Mount the Merge Link hook only
after a fresh token is returned. Show signal provenance and an explicit link to
`/` for sample mode. Require `window.confirm` before DELETE.

- [ ] **Step 4: Add route-scoped security headers**

Add CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
`X-Frame-Options`, and `Cross-Origin-Opener-Policy` for `/merge-demo` and its API
routes without changing the rendering behavior at `/`.

- [ ] **Step 5: Document exact external setup**

Update `.env.example` and README with Google callback
`/api/auth/callback/google`, Merge Tool Pack requirements, the
`google-calendar` connector, read-only `list_events`, deployment-level rate
limiting, and the real-OAuth smoke-test requirement.

- [ ] **Step 6: Run complete verification**

Run:

```bash
npm test
npm run build
npm audit --omit=dev
git diff --check
git grep -nE '(AIza[0-9A-Za-z_-]{30,}|sk-[0-9A-Za-z]{20,}|Bearer [0-9A-Za-z._-]{20,})'
```

Expected: tests and build pass; audit reports no actionable production
vulnerabilities; whitespace and secret scans are clean.

- [ ] **Step 7: Browser smoke test**

Verify `/` still completes its fixture flow, `/merge-demo` renders the safe
unconfigured state without secrets, API mutation routes reject unauthenticated
requests, and response security headers are present.
