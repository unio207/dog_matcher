import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RawMergeData, SignalKey } from "@/types";
import { personas } from "@/data/fixtures/personas";
import { FixtureMergeSource, getMergeSource } from "..";
import { LiveMergeSource, normalizeCalendarSignals } from "../live";

const SIGNAL_KEYS: SignalKey[] = [
  "meetingDensity",
  "timeOfDaySpread",
  "weekendLoad",
  "longestFreeBlock",
  "travelGaps",
  "groupEventRatio",
  "messageVolume",
  "afterHoursActivity",
  "fileActivity",
];

function assertValid(data: RawMergeData) {
  expect(typeof data.personaId).toBe("string");
  expect(data.personaId.length).toBeGreaterThan(0);
  expect(Array.isArray(data.connectors)).toBe(true);
  expect(data.connectors.length).toBeGreaterThan(0);
  for (const key of SIGNAL_KEYS) {
    const sig = data.signals[key];
    expect(sig, `missing signal ${key}`).toBeDefined();
    expect(typeof sig.value).toBe("number");
    expect(sig.value).toBeGreaterThanOrEqual(0);
    expect(sig.value).toBeLessThanOrEqual(1);
    expect(typeof sig.raw).toBe("string");
    expect(sig.raw.length).toBeGreaterThan(0);
    expect(typeof sig.synthetic).toBe("boolean");
  }
  expect(Object.keys(data.signals).sort()).toEqual([...SIGNAL_KEYS].sort());
}

const env = { ...process.env };

beforeEach(() => {
  // Zero network access: any fetch is a test failure, not a fallback path.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("network access attempted in fixture test");
    })
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  process.env = { ...env };
});

describe("FixtureMergeSource", () => {
  const ids = Object.keys(personas);

  it("has all five personas", () => {
    expect(ids.sort()).toEqual(
      ["busyTraveler", "homebody", "outdoorsy", "quietApartment", "socialHost"].sort()
    );
  });

  it.each(ids)("returns valid RawMergeData for %s with no network", async (id) => {
    process.env.FIXTURE_PERSONA = id;
    const data = await new FixtureMergeSource().getRawMergeData();
    expect(data.personaId).toBe(id);
    assertValid(data);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("defaults to the Basset-compatible homebody when FIXTURE_PERSONA is unset", async () => {
    delete process.env.FIXTURE_PERSONA;
    const data = await new FixtureMergeSource().getRawMergeData();
    expect(data.personaId).toBe("homebody");
  });

  it("falls back to the Basset-compatible homebody for an unknown persona id", async () => {
    process.env.FIXTURE_PERSONA = "not-a-persona";
    const data = await new FixtureMergeSource().getRawMergeData();
    expect(data.personaId).toBe("homebody");
    assertValid(data);
  });

  it("marks every fixture signal synthetic", async () => {
    const data = await new FixtureMergeSource().getRawMergeData();
    for (const key of SIGNAL_KEYS) expect(data.signals[key].synthetic).toBe(true);
  });
});

describe("getMergeSource selection", () => {
  it("defaults to fixture when DATA_SOURCE is unset", async () => {
    delete process.env.DATA_SOURCE;
    const source = getMergeSource();
    expect(source.kind).toBe("fixture");
    assertValid(await source.getRawMergeData());
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses fixture for DATA_SOURCE=fixture", async () => {
    process.env.DATA_SOURCE = "fixture";
    const source = getMergeSource();
    expect(source.kind).toBe("fixture");
    assertValid(await source.getRawMergeData());
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses live for DATA_SOURCE=live", () => {
    process.env.DATA_SOURCE = "live";
    expect(getMergeSource().kind).toBe("live");
  });
});

describe("LiveMergeSource failure fallback", () => {
  it("returns fixture data when creds are missing", async () => {
    delete process.env.MERGE_AGENT_HANDLER_KEY;
    process.env.FIXTURE_PERSONA = "homebody";
    const data = await new LiveMergeSource().getRawMergeData();
    expect(data).toEqual(personas.homebody);
    assertValid(data);
  });

  it("returns fixture data when the network throws", async () => {
    process.env.MERGE_AGENT_HANDLER_KEY = "k";
    process.env.MERGE_TOOL_PACK_ID = "tp";
    process.env.MERGE_REGISTERED_USER_ID = "ru";
    process.env.FIXTURE_PERSONA = "socialHost";
    const data = await new LiveMergeSource().getRawMergeData();
    expect(data).toEqual(personas.socialHost);
  });

  it("returns fixture data on a non-200 response", async () => {
    process.env.MERGE_AGENT_HANDLER_KEY = "k";
    process.env.MERGE_TOOL_PACK_ID = "tp";
    process.env.MERGE_REGISTERED_USER_ID = "ru";
    process.env.FIXTURE_PERSONA = "quietApartment";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 }))
    );
    const data = await new LiveMergeSource().getRawMergeData();
    expect(data).toEqual(personas.quietApartment);
  });

  it("never surfaces an error and never leaks the key", async () => {
    process.env.MERGE_AGENT_HANDLER_KEY = "super-secret";
    process.env.MERGE_TOOL_PACK_ID = "tp";
    process.env.MERGE_REGISTERED_USER_ID = "ru";
    const data = await new LiveMergeSource().getRawMergeData();
    expect(JSON.stringify(data)).not.toContain("super-secret");
  });
});

describe("normalizeCalendarSignals", () => {
  const day = 864e5;
  const base = Date.UTC(2026, 0, 5, 9, 0, 0); // Monday 09:00

  it("marks calendar signals non-synthetic and stays in 0-1", () => {
    const events = [
      {
        start: { dateTime: new Date(base).toISOString() },
        end: { dateTime: new Date(base + 36e5).toISOString() },
        attendees: [{}, {}, {}],
      },
      {
        start: { dateTime: new Date(base + day).toISOString() },
        end: { dateTime: new Date(base + day + 36e5).toISOString() },
        attendees: [{}],
      },
    ];
    const signals = normalizeCalendarSignals(events, 30);
    for (const sig of Object.values(signals)) {
      expect(sig.synthetic).toBe(false);
      expect(sig.value).toBeGreaterThanOrEqual(0);
      expect(sig.value).toBeLessThanOrEqual(1);
      expect(sig.raw.length).toBeGreaterThan(0);
    }
    expect(signals.groupEventRatio.value).toBeCloseTo(0.5, 5);
  });

  it("handles an empty calendar without NaN", () => {
    const signals = normalizeCalendarSignals([], 30);
    for (const sig of Object.values(signals)) expect(Number.isFinite(sig.value)).toBe(true);
    expect(signals.meetingDensity.value).toBe(0);
    expect(signals.longestFreeBlock.value).toBe(1);
  });

  it("ignores malformed events", () => {
    const signals = normalizeCalendarSignals(
      [{}, { start: { dateTime: "garbage" } }, { start: {} }],
      30
    );
    expect(signals.meetingDensity.value).toBe(0);
    expect(signals.groupEventRatio.value).toBe(0);
  });

  it("counts multi-day all-day events as travel gaps", () => {
    const events = Array.from({ length: 4 }, (_, i) => ({
      start: { date: new Date(base + i * 7 * day).toISOString().slice(0, 10) },
      end: { date: new Date(base + i * 7 * day + 3 * day).toISOString().slice(0, 10) },
    }));
    const signals = normalizeCalendarSignals(events, 30);
    expect(signals.travelGaps.value).toBeCloseTo(0.5, 5);
  });
});
