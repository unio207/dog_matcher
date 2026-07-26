import type { RawMergeData } from "@/types";

/** Adapter for anything that can produce normalized signal data. */
export interface MergeSource {
  /** Stable id for logging/debug, e.g. "fixture" | "live". */
  readonly kind: string;
  getRawMergeData(): Promise<RawMergeData>;
}
