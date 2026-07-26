# Public Merge Demo Design

## Goal

Add a separate `/merge-demo` page that demonstrates a real, per-user Google
Calendar connection through Merge Agent Handler without changing or risking the
fixture-backed presentation at `/`.

## Scope

- Google is the only application sign-in provider.
- Google Calendar is the only live Merge connector in this release.
- Slack and Google Drive remain deterministic sample inputs and are visibly
  labeled as samples.
- The existing `/` demo and `/api/profile` behavior remain unchanged.
- The app stores no raw calendar events, OAuth credentials, or user profiles.

## Architecture

Auth.js handles Google OAuth and encrypted, HTTP-only sessions. The authenticated
Google subject is HMAC-pseudonymized with `MERGE_USER_ID_SECRET` before it is sent
to Merge as `origin_user_id`; email addresses and raw Google identifiers are not
used as Merge identifiers.

The browser can request a single-use Merge Link token from an authenticated,
same-origin route. The server idempotently creates or recovers one Merge
Registered User for the signed-in person and mints a token locked to the
`google-calendar` connector. Only the short-lived Link token reaches the
browser. The Merge access key, Tool Pack ID, Registered User ID, and MCP URL stay
server-only.

After Link succeeds, a separate authenticated profile route calls the
allow-listed Calendar `list_events` tool through the configured Tool Pack for a
fixed 30-day window and a maximum of 250 events. It immediately reduces the
response to the six existing calendar signals, combines those values with
clearly synthetic Slack and Drive fixture signals, and returns the existing
`RawMergeData` shape with accurate provenance.

## User Flow

1. A visitor opens `/merge-demo`.
2. If the integration is not configured, the page shows a non-sensitive setup
   message and a link back to the reliable fixture demo.
3. If signed out, the visitor sees the privacy boundary and a Google sign-in
   action.
4. After sign-in, the visitor requests a fresh Calendar Link token and completes
   Merge Link.
5. Link success enables **Build my live profile**. No calendar data is fetched
   before this explicit action.
6. The returned aggregate signals are shown on the separate page. Raw events
   never cross the server boundary.
7. On any live failure, the page reports a retryable error and offers the
   existing sample demo. It never silently labels fixtures as live.
8. **Disconnect and delete my Merge data** permanently deletes the signed-in
   user's Merge Registered User and credentials after explicit confirmation.

## Server Boundaries

### Authentication

- Auth.js Google OAuth uses the JWT session strategy; no application database is
  introduced.
- The server requires a session containing the provider account subject for
  every Merge management or MCP action.
- Auth cookies use Auth.js secure defaults and production HTTPS.

### Identity Isolation

- `origin_user_id = HMAC-SHA-256(MERGE_USER_ID_SECRET, "google:" + providerSub)`.
- The raw provider subject and email are never sent to Merge.
- Registered User IDs are resolved server-side per request and are never
  accepted from browser input.

### Merge Management API

- The API base defaults to `https://ah-api.merge.dev` and may only be overridden
  by an HTTPS URL.
- Requests use fixed paths, bearer authentication, JSON content types, an
  eight-second timeout, `cache: "no-store"`, and bounded response parsing.
- Link token bodies always use the fixed `google-calendar` connector slug.
- Error messages returned to the browser are generic and contain no upstream
  response bodies, credentials, identifiers, or URLs.

### MCP Data Plane

- The server constructs the MCP URL from trusted environment values.
- Tool discovery may select only a tool whose exact suffix is `list_events`.
- The call arguments use `calendarId: "primary"`, a server-generated 30-day UTC
  range, recurring-event expansion, chronological order, and `maxResults: 250`.
- At most 250 parsed events are accepted. Oversized, malformed, or non-JSON
  responses fail closed.
- Event summaries, descriptions, locations, conference data, and attendee
  identities are ignored. Only start, end, all-day status, and attendee count
  are retained long enough to compute aggregates.

### Request Security

- State-changing routes require an authenticated session and a same-origin
  `Origin` header in production.
- Responses use `Cache-Control: no-store` and JSON content types.
- Per-process, per-user rate limits protect link-token, profile, and delete
  operations; Merge's organization limits remain the outer boundary. A
  deployment-level distributed rate limit is required before high-traffic use.
- Global headers set a restrictive Content Security Policy, frame protections,
  MIME sniffing protection, referrer policy, and a minimal permissions policy.
- The CSP permits only the exact Merge Link and Google/Auth.js resources needed
  by the page; it does not use wildcard script sources.

## Configuration

The live page requires:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `MERGE_AGENT_HANDLER_KEY`
- `MERGE_TOOL_PACK_ID`
- `MERGE_USER_ID_SECRET`
- `NEXTAUTH_URL` (canonical public HTTPS origin in proxied deployments)

Optional:

- `MERGE_AGENT_HANDLER_BASE_URL` (HTTPS only)
- `MERGE_CALENDAR_TOOL_NAME` (must end in `list_events`)

Secrets remain in `.env.local` or the deployment secret store. `.env.example`
contains names and setup guidance only.

## Error Handling

- Missing configuration: `503` with a generic `not_configured` code.
- Missing session: `401`.
- Cross-origin request: `403`.
- Rate limit exceeded: `429` with `Retry-After`.
- Merge authentication/authorization failure: generic `502`; no fixture
  substitution.
- Merge timeout or malformed payload: generic `502`; no raw response logging.
- Deletion of an already-absent user is treated as a successful end state.

## Testing

Unit and route-level tests cover:

- deterministic HMAC identity derivation without raw identifier leakage;
- configuration validation and HTTPS base enforcement;
- authenticated and unauthenticated route behavior;
- production same-origin enforcement;
- per-user rate limits;
- fixed connector allow-listing and single-use token generation;
- secret, Registered User ID, MCP URL, and upstream-body non-disclosure;
- tool allow-listing, time bounds, result caps, malformed responses, and
  timeouts;
- accurate live Calendar versus synthetic Slack/Drive provenance;
- deletion behavior; and
- security headers.

Final verification runs the complete Vitest suite, TypeScript production build,
dependency audit, tracked-file secret scan, git diff inspection, localhost route
smoke test, and browser check of both `/` and `/merge-demo`.

## Deployment Notes

The page is production-shaped but cannot complete Google or Merge OAuth without
valid external credentials and matching callback origins. The implementation is
considered locally verified when the configured-state and unconfigured-state
paths, all mocked upstream flows, tests, build, headers, and browser rendering
pass. A real OAuth smoke test must be completed after deployment secrets and
provider callback URLs are installed.
