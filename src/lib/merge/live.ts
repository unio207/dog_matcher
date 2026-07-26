import type { RawMergeData, Signal } from "@/types";
import type { MergeSource } from "./types";
import { FixtureMergeSource, getPersona } from "./fixture";

// ---------------------------------------------------------------------------
// Merge Agent Handler (NOT the Unified API).
//
// Docs: https://docs.merge.dev/merge-agent-handler/agent-handler/mcp/endpoint-post
//   POST {base}/api/v1/tool-packs/{toolPackId}/registered-users/{userId}/mcp/
//   Authorization: Bearer <MERGE_AGENT_HANDLER_KEY>
//   Body: JSON-RPC 2.0 — { jsonrpc, id, method: "tools/list" | "tools/call", params }
//
// Server-side only. Keys are read from process.env and never returned to the
// caller. Every failure path falls back to fixtures — the demo never errors.
// ---------------------------------------------------------------------------

const AH_BASE = process.env.MERGE_AGENT_HANDLER_BASE_URL || "https://ah-api.merge.dev";
const WINDOW_DAYS = 30;
const TIMEOUT_MS = 8000;

type JsonRpcResult = { result?: Record<string, unknown>; error?: unknown };

async function mcp(method: string, params?: unknown): Promise<Record<string, unknown>> {
  const key = process.env.MERGE_AGENT_HANDLER_KEY;
  const toolPackId = process.env.MERGE_TOOL_PACK_ID;
  const userId = process.env.MERGE_REGISTERED_USER_ID;
  if (!key || !toolPackId || !userId) {
    throw new Error(
      "missing MERGE_AGENT_HANDLER_KEY / MERGE_TOOL_PACK_ID / MERGE_REGISTERED_USER_ID"
    );
  }

  const url = `${AH_BASE}/api/v1/tool-packs/${encodeURIComponent(
    toolPackId
  )}/registered-users/${encodeURIComponent(userId)}/mcp/?format=json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`agent handler ${method} -> HTTP ${res.status}`);
  const json = (await res.json()) as JsonRpcResult;
  if (json.error) throw new Error(`agent handler ${method} -> ${JSON.stringify(json.error)}`);
  if (!json.result) throw new Error(`agent handler ${method} -> no result`);
  return json.result;
}

/** Tool names may or may not be connector-prefixed, so discover by suffix. */
async function resolveListEventsTool(): Promise<string> {
  const override = process.env.MERGE_CALENDAR_TOOL_NAME;
  if (override) return override;
  const result = await mcp("tools/list");
  const tools = (result.tools as { name?: string }[] | undefined) ?? [];
  const match = tools.find((t) => typeof t.name === "string" && t.name.endsWith("list_events"));
  if (!match?.name) throw new Error("no list_events tool in tool pack");
  return match.name;
}

export interface CalEvent {
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: unknown[];
}

/** Tool results come back as MCP content blocks; the JSON payload is in text. */
function extractEvents(result: Record<string, unknown>): CalEvent[] {
  const content = (result.content as { type?: string; text?: string }[] | undefined) ?? [];
  for (const block of content) {
    if (typeof block.text !== "string") continue;
    try {
      const parsed = JSON.parse(block.text);
      const items = Array.isArray(parsed) ? parsed : parsed?.items ?? parsed?.events;
      if (Array.isArray(items)) return items as CalEvent[];
    } catch {
      // not JSON — try the next block
    }
  }
  throw new Error("could not parse events from tool result");
}

async function fetchCalendarEvents(): Promise<CalEvent[]> {
  const now = Date.now();
  const toolName = await resolveListEventsTool();
  const result = await mcp("tools/call", {
    name: toolName,
    arguments: {
      calendarId: "primary",
      timeMin: new Date(now - WINDOW_DAYS * 864e5).toISOString(),
      timeMax: new Date(now).toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    },
  });
  return extractEvents(result);
}

// --------------------------- normalization ---------------------------------

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const r2 = (n: number) => Math.round(n * 100) / 100;
const live = (value: number, raw: string): Signal => ({ value: r2(clamp01(value)), raw, synthetic: false });

interface Parsed {
  start: number;
  end: number;
  allDay: boolean;
  attendees: number;
}

function parseEvents(events: CalEvent[]): Parsed[] {
  const out: Parsed[] = [];
  for (const e of events) {
    const startIso = e.start?.dateTime ?? e.start?.date;
    if (!startIso) continue;
    const start = Date.parse(startIso);
    if (Number.isNaN(start)) continue;
    const endIso = e.end?.dateTime ?? e.end?.date;
    const parsedEnd = endIso ? Date.parse(endIso) : NaN;
    const end = Number.isNaN(parsedEnd) ? start + 36e5 : parsedEnd;
    out.push({
      start,
      end,
      allDay: !e.start?.dateTime,
      attendees: Array.isArray(e.attendees) ? e.attendees.length : 0,
    });
  }
  return out.sort((a, b) => a.start - b.start);
}

type CalendarSignals = Pick<
  RawMergeData["signals"],
  | "meetingDensity"
  | "timeOfDaySpread"
  | "weekendLoad"
  | "longestFreeBlock"
  | "travelGaps"
  | "groupEventRatio"
>;

/** Pure: raw Google Calendar events -> the six calendar-derived signals. */
export function normalizeCalendarSignals(
  events: CalEvent[],
  windowDays = WINDOW_DAYS
): CalendarSignals {
  const parsed = parseEvents(events);
  const n = parsed.length;
  const weeks = Math.max(windowDays / 7, 1);
  const perWeek = n / weeks;

  const timed = parsed.filter((p) => !p.allDay);
  const hours = timed.map((p) => new Date(p.start).getHours());
  const minH = hours.length ? Math.min(...hours) : 0;
  const maxH = hours.length ? Math.max(...hours) : 0;
  const spread = hours.length >= 2 ? (maxH - minH) / 16 : 0;

  let weekend = 0;
  for (const p of parsed) {
    const d = new Date(p.start).getDay();
    if (d === 0 || d === 6) weekend++;
  }
  const weekday = n - weekend;
  // Compare per-day rates so a 2-day weekend isn't penalised against 5 weekdays.
  const weekendRate = weekend / 2;
  const weekdayRate = weekday / 5;
  const weekendLoad = weekdayRate > 0 ? weekendRate / weekdayRate : weekend > 0 ? 1 : 0;

  let longestGapH = windowDays * 24;
  if (timed.length >= 2) {
    longestGapH = 0;
    for (let i = 1; i < timed.length; i++) {
      const gap = (timed[i].start - timed[i - 1].end) / 36e5;
      if (gap > longestGapH) longestGapH = gap;
    }
  }

  const multiDay = parsed.filter((p) => p.allDay && p.end - p.start >= 2 * 864e5).length;
  const group = parsed.filter((p) => p.attendees >= 3).length;
  const groupRatio = n > 0 ? group / n : 0;

  return {
    meetingDensity: live(perWeek / 30, `${Math.round(perWeek)} meetings/week`),
    timeOfDaySpread: live(
      spread,
      hours.length >= 2 ? `active ${minH}:00–${maxH}:00` : "not enough timed events"
    ),
    weekendLoad: live(weekendLoad, `${weekend} weekend events in ${windowDays} days`),
    longestFreeBlock: live(
      longestGapH / 48,
      `longest free block: ${Math.round(longestGapH)}h`
    ),
    travelGaps: live(multiDay / 8, `${multiDay} multi-day blocks in ${windowDays} days`),
    groupEventRatio: live(
      groupRatio,
      `${Math.round(groupRatio * 100)}% of events with 3+ attendees`
    ),
  };
}

// ------------------------------- source ------------------------------------

export class LiveMergeSource implements MergeSource {
  readonly kind = "live";

  async getRawMergeData(): Promise<RawMergeData> {
    const fixture = getPersona();
    try {
      const events = await fetchCalendarEvents();
      const calendar = normalizeCalendarSignals(events);
      return {
        personaId: fixture.personaId,
        connectors: fixture.connectors,
        signals: {
          ...calendar,
          // Slack/Drive are not live in this MVP — synthetic, from fixtures.
          messageVolume: fixture.signals.messageVolume,
          afterHoursActivity: fixture.signals.afterHoursActivity,
          fileActivity: fixture.signals.fileActivity,
        },
      };
    } catch (err) {
      console.error("[merge] live calendar failed, falling back to fixture:", err);
      return new FixtureMergeSource().getRawMergeData();
    }
  }
}
