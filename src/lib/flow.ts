"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyze } from "@/lib/analyze";
import { match } from "@/lib/match";
import { toGenome } from "@/lib/genome";
import { dogs } from "@/data/dogs";
import type {
  DogGenome,
  FlowState,
  HumanProfile,
  MatchResult,
  RawMergeData,
  SignalKey,
} from "@/types";

// ---------- flow states ----------

export const FLOW_STATES: FlowState[] = [
  "connect",
  "analyzing",
  "profile",
  "generating",
  "dog",
  "nearby",
];

export function isFlowState(v: string | null): v is FlowState {
  return !!v && (FLOW_STATES as string[]).includes(v);
}

// ---------- the one place everything is computed ----------

export interface FlowData {
  raw: RawMergeData;
  profile: HumanProfile;
  genome: DogGenome;
  matches: MatchResult[];
}

/** Synchronous. Called the instant raw data exists, BEFORE any animated
 *  screen is entered. The animations are theater over these results. */
export function computeAll(raw: RawMergeData): FlowData {
  const profile = analyze(raw);
  const genome = toGenome(profile);
  const matches = match(profile, dogs);
  return { raw, profile, genome, matches };
}

// ---------- signal display order ----------

export const SIGNAL_ORDER: SignalKey[] = [
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

export const SIGNAL_LABELS: Record<SignalKey, string> = {
  meetingDensity: "meeting density",
  timeOfDaySpread: "time-of-day spread",
  weekendLoad: "weekend load",
  longestFreeBlock: "longest free block",
  travelGaps: "travel gaps",
  groupEventRatio: "group event ratio",
  messageVolume: "message volume",
  afterHoursActivity: "after-hours activity",
  fileActivity: "file activity",
};

// ---------- genome parameter display order ----------

export const GENOME_NUMERIC_KEYS = [
  "bodyLength",
  "bodyHeight",
  "legLength",
  "headSize",
  "earDroop",
  "earSize",
  "snoutLength",
  "tailLength",
  "tailCurl",
  "fluffiness",
  "posture",
] as const;

export const GENOME_COLOR_KEYS = ["coatColor", "accentColor"] as const;

export const GENOME_LABELS: Record<keyof DogGenome, string> = {
  bodyLength: "body length",
  bodyHeight: "body height",
  legLength: "leg length",
  headSize: "head size",
  earDroop: "ear droop",
  earSize: "ear size",
  snoutLength: "snout length",
  tailLength: "tail length",
  tailCurl: "tail curl",
  coatColor: "coat color",
  accentColor: "accent color",
  fluffiness: "fluffiness",
  posture: "posture",
};

// ---------- timeline ----------

/** Total durations for the two theater screens. One number each. */
export const ANALYZING_MS = 12000;
export const GENERATING_MS = 14000;
export const CONNECT_MS = 1800;

/**
 * A pure-timer reveal timeline. No promises, no work — it only counts.
 *
 * `steps` items are revealed one at a time across the first 80% of
 * `totalMs`; the timeline then holds at complete until the screen's proceed
 * button is clicked. `skip()` reveals everything without navigating.
 * Re-runnable: bump `runId` (or remount) to replay.
 */
export function useTimeline(opts: {
  steps: number;
  totalMs: number;
  runId?: number;
}) {
  const { steps, totalMs, runId = 0 } = opts;

  const [revealed, setRevealed] = useState(0);
  const [complete, setComplete] = useState(false);
  const doneRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearScheduled = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    clearScheduled();
    doneRef.current = false;
    setRevealed(0);
    setComplete(false);

    const timers: ReturnType<typeof setTimeout>[] = [];
    const revealWindow = totalMs * 0.8;
    const gap = steps > 0 ? revealWindow / steps : 0;

    for (let i = 0; i < steps; i++) {
      timers.push(
        setTimeout(() => {
          if (!doneRef.current) setRevealed(i + 1);
        }, Math.round(gap * (i + 1)))
      );
    }
    timers.push(
      setTimeout(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        setRevealed(steps);
        setComplete(true);
      }, totalMs)
    );
    timersRef.current = timers;

    return clearScheduled;
  }, [clearScheduled, steps, totalMs, runId]);

  const skip = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearScheduled();
    setRevealed(steps);
    setComplete(true);
  }, [clearScheduled, steps]);

  return { revealed, complete, skip };
}

export const pct = (v: number) => `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;
