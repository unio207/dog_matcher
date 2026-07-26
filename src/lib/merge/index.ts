import type { RawMergeData } from "@/types";
import type { MergeSource } from "./types";
import { FixtureMergeSource } from "./fixture";
import { LiveMergeSource } from "./live";

export type { MergeSource } from "./types";
export { FixtureMergeSource, getPersona, DEFAULT_PERSONA } from "./fixture";
export { LiveMergeSource, normalizeCalendarSignals } from "./live";

/** Fixture is the default; only DATA_SOURCE=live opts into the network. */
export function getMergeSource(): MergeSource {
  return process.env.DATA_SOURCE === "live" ? new LiveMergeSource() : new FixtureMergeSource();
}

export function getRawMergeData(): Promise<RawMergeData> {
  return getMergeSource().getRawMergeData();
}
