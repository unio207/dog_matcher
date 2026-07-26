import type {
  HumanProfile,
  RawMergeData,
  Signal,
  Trait,
  TraitKey,
} from "@/types";

// Deterministic, pure signal -> trait mapping. No LLM, no randomness, no clock.
// Every trait is an explicit weighted combination of the nine merge signals,
// and every trait carries evidence strings built from the signals' `raw` text.

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Round to 3 decimals so trait values are stable across platforms. */
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Sentence-case a raw signal string for display ("11 meetings/week" stays as-is). */
function cap(raw: string): string {
  if (!raw) return raw;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** "<Raw signal> → <what it implies>" — displayed verbatim in the UI. */
function ev(signal: Signal, implication: string): string {
  return `${cap(signal.raw)} → ${implication}`;
}

const LABELS: Record<TraitKey, string> = {
  activityLevel: "Activity level",
  homePresence: "Home presence",
  routineStability: "Routine stability",
  noiseLevel: "Household noise",
  patience: "Patience",
  socialDensity: "Social density",
};

/** Pick one of two phrasings based on which side of the midpoint a signal sits. */
const pick = (v: number, high: string, low: string) => (v >= 0.5 ? high : low);

export function analyze(raw: RawMergeData): HumanProfile {
  const s = raw.signals;

  // ---- activityLevel ----
  // Weekend load dominates (that is when discretionary movement happens), a
  // wide active day adds to it, and a packed meeting calendar subtracts.
  const activityLevel = clamp01(
    0.55 * s.weekendLoad.value +
      0.25 * s.timeOfDaySpread.value +
      0.2 * (1 - s.meetingDensity.value)
  );

  // ---- homePresence ----
  // Travel is the strongest negative; long free blocks and a light calendar
  // mean someone is actually in the house.
  const homePresence = clamp01(
    0.45 * (1 - s.travelGaps.value) +
      0.35 * s.longestFreeBlock.value +
      0.2 * (1 - s.meetingDensity.value)
  );

  // ---- routineStability ----
  // A tight time-of-day window, no travel, and no after-hours drift all mean
  // the same hour looks the same every day.
  const routineStability = clamp01(
    0.4 * (1 - s.timeOfDaySpread.value) +
      0.3 * (1 - s.travelGaps.value) +
      0.3 * (1 - s.afterHoursActivity.value)
  );

  // ---- noiseLevel ----
  // Proxy for how loud/busy the home feels: message firehose, group events,
  // and activity spilling into the evening.
  const noiseLevel = clamp01(
    0.5 * s.messageVolume.value +
      0.3 * s.groupEventRatio.value +
      0.2 * s.afterHoursActivity.value
  );

  // ---- patience ----
  // Unhurried time is the raw material of patience: long free blocks, few
  // meetings, and no late-night firefighting.
  const patience = clamp01(
    0.4 * s.longestFreeBlock.value +
      0.3 * (1 - s.meetingDensity.value) +
      0.3 * (1 - s.afterHoursActivity.value)
  );

  // ---- socialDensity ----
  // How many other humans are around: group ratio first, then meeting and
  // message volume.
  const socialDensity = clamp01(
    0.5 * s.groupEventRatio.value +
      0.3 * s.meetingDensity.value +
      0.2 * s.messageVolume.value
  );

  const traits: Trait[] = [
    {
      key: "activityLevel",
      label: LABELS.activityLevel,
      value: round3(activityLevel),
      evidence: [
        ev(
          s.weekendLoad,
          pick(
            s.weekendLoad.value,
            "weekends are spent moving",
            "weekends stay low-effort"
          )
        ),
        ev(
          s.timeOfDaySpread,
          pick(
            s.timeOfDaySpread.value,
            "long active day, room for a real walk",
            "a narrow daily window to get out"
          )
        ),
        ...(s.meetingDensity.value >= 0.7
          ? [ev(s.meetingDensity, "the calendar eats the daylight")]
          : []),
      ],
    },
    {
      key: "homePresence",
      label: LABELS.homePresence,
      value: round3(homePresence),
      evidence: [
        ev(
          s.travelGaps,
          pick(
            s.travelGaps.value,
            "the house is empty for days at a time",
            "you are almost never away overnight"
          )
        ),
        ev(
          s.longestFreeBlock,
          pick(
            s.longestFreeBlock.value,
            "long stretches at home",
            "home only in short gaps"
          )
        ),
      ],
    },
    {
      key: "routineStability",
      label: LABELS.routineStability,
      value: round3(routineStability),
      evidence: [
        ev(
          s.timeOfDaySpread,
          pick(
            s.timeOfDaySpread.value,
            "the day starts and ends at a different time each day",
            "the same hours every day"
          )
        ),
        ev(
          s.afterHoursActivity,
          pick(
            s.afterHoursActivity.value,
            "evenings get pulled back into work",
            "evenings stay predictable"
          )
        ),
        ...(s.travelGaps.value >= 0.5
          ? [ev(s.travelGaps, "the schedule resets after every trip")]
          : []),
      ],
    },
    {
      key: "noiseLevel",
      label: LABELS.noiseLevel,
      value: round3(noiseLevel),
      evidence: [
        ev(
          s.messageVolume,
          pick(
            s.messageVolume.value,
            "constant notifications and talking",
            "a quiet channel load"
          )
        ),
        ev(
          s.groupEventRatio,
          pick(
            s.groupEventRatio.value,
            "people coming and going",
            "few visitors"
          )
        ),
        ...(s.afterHoursActivity.value >= 0.6
          ? [ev(s.afterHoursActivity, "the noise continues late")]
          : []),
      ],
    },
    {
      key: "patience",
      label: LABELS.patience,
      value: round3(patience),
      evidence: [
        ev(
          s.longestFreeBlock,
          pick(
            s.longestFreeBlock.value,
            "time to let things happen slowly",
            "very little unhurried time"
          )
        ),
        ev(
          s.meetingDensity,
          pick(
            s.meetingDensity.value,
            "back-to-back commitments leave no slack",
            "a calendar with slack in it"
          )
        ),
      ],
    },
    {
      key: "socialDensity",
      label: LABELS.socialDensity,
      value: round3(socialDensity),
      evidence: [
        ev(
          s.groupEventRatio,
          pick(
            s.groupEventRatio.value,
            "most of your time is with other people",
            "most of your time is on your own"
          )
        ),
        ev(
          s.meetingDensity,
          pick(
            s.meetingDensity.value,
            "a dense week of people",
            "a light week of people"
          )
        ),
        ...(s.messageVolume.value >= 0.6
          ? [ev(s.messageVolume, "a large circle to keep up with")]
          : []),
      ],
    },
  ];

  return { traits, summary: buildSummary(traits) };
}

/** Short phrase used in the summary for a trait at its high / low end. */
const SUMMARY_PHRASES: Record<TraitKey, { high: string; low: string }> = {
  activityLevel: {
    high: "you move a lot",
    low: "you keep a low-mileage week",
  },
  homePresence: {
    high: "you are home most of the time",
    low: "you are out of the house a lot",
  },
  routineStability: {
    high: "your days run on a steady clock",
    low: "your schedule shifts constantly",
  },
  noiseLevel: {
    high: "your home is a loud one",
    low: "your home stays quiet",
  },
  patience: {
    high: "you have unhurried time to give",
    low: "your time comes in small pressured pieces",
  },
  socialDensity: {
    high: "there are people around you constantly",
    low: "you spend most of your time alone",
  },
};

/** Deterministic 1-2 sentence summary built from the two most extreme traits
 *  plus the weakest trait, so the caveat always appears. */
function buildSummary(traits: Trait[]): string {
  // Rank by distance from the midpoint; ties break on TraitKey order (stable sort
  // over the fixed input order), so the output is fully deterministic.
  const byExtremity = [...traits].sort(
    (a, b) => Math.abs(b.value - 0.5) - Math.abs(a.value - 0.5)
  );
  const dominant = byExtremity.slice(0, 2);
  const weakest = [...traits].sort((a, b) => a.value - b.value)[0];

  const phrase = (t: Trait) =>
    t.value >= 0.5 ? SUMMARY_PHRASES[t.key].high : SUMMARY_PHRASES[t.key].low;

  const first = `Your calendar says ${phrase(dominant[0])} and ${phrase(
    dominant[1]
  )}.`;
  const second = dominant.some((t) => t.key === weakest.key)
    ? ""
    : ` The thinnest part of your week is ${weakest.label.toLowerCase()} — ${phrase(
        weakest
      )}.`;

  return first + second;
}

/** Convenience accessor for downstream code (matching, UI). */
export function traitValue(profile: HumanProfile, key: TraitKey): number {
  const t = profile.traits.find((x) => x.key === key);
  return t ? t.value : 0.5;
}
