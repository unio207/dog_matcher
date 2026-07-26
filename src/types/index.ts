// Shared contracts for Shepard. Subagents import from here and must not modify.

// ---------- Merge layer ----------

/** A single normalized signal extracted from connected accounts. */
export interface Signal {
  /** 0-1 normalized value */
  value: number;
  /** Raw human-readable form, e.g. "23 meetings/week" — shown in UI evidence */
  raw: string;
  /** True when the signal was synthesized (not from a live connector) */
  synthetic: boolean;
}

/** Normalized output of the Merge layer. Signal-oriented; downstream code
 *  never knows which connector produced a field. */
export interface RawMergeData {
  personaId: string;
  connectors: string[]; // e.g. ["google-calendar", "slack", "drive"]
  signals: {
    /** meetings per week, normalized (0 = none, 1 = back-to-back) */
    meetingDensity: Signal;
    /** how spread activity is across the day (0 = tight 9-5, 1 = all hours) */
    timeOfDaySpread: Signal;
    /** weekend load relative to weekday load (0 = weekends free, 1 = equal) */
    weekendLoad: Signal;
    /** longest uninterrupted free block, normalized (1 = whole days free) */
    longestFreeBlock: Signal;
    /** frequency of multi-day travel gaps (0 = never travels, 1 = constant) */
    travelGaps: Signal;
    /** solo vs group events (0 = all solo, 1 = all group) */
    groupEventRatio: Signal;
    /** message volume across channels (0 = quiet, 1 = firehose) */
    messageVolume: Signal;
    /** after-hours message activity (0 = none, 1 = heavy) */
    afterHoursActivity: Signal;
    /** document/file activity level (0 = light, 1 = heavy) */
    fileActivity: Signal;
  };
}

export type SignalKey = keyof RawMergeData["signals"];

// ---------- Human profile ----------

export type TraitKey =
  | "activityLevel"
  | "homePresence"
  | "routineStability"
  | "noiseLevel"
  | "patience"
  | "socialDensity";

export interface Trait {
  key: TraitKey;
  label: string;
  /** 0-1 */
  value: number;
  /** Human-readable strings explaining what in the data produced this trait */
  evidence: string[];
}

export interface HumanProfile {
  traits: Trait[];
  summary: string;
}

// ---------- Dog genome (drives the procedural 3D model) ----------

/** All values 0-1 unless noted. */
export interface DogGenome {
  bodyLength: number;
  bodyHeight: number;
  legLength: number;
  headSize: number;
  /** 0 = pointy upright ears, 1 = large floppy ears */
  earDroop: number;
  earSize: number;
  snoutLength: number;
  tailLength: number;
  /** 0 = straight, 1 = tight curl */
  tailCurl: number;
  /** hex color, e.g. "#c8965a" */
  coatColor: string;
  /** secondary hex color for belly/snout/paws */
  accentColor: string;
  /** 0 = sleek, 1 = very fluffy */
  fluffiness: number;
  /** 0 = relaxed (head low, tail down), 1 = alert (head up, ears perked) */
  posture: number;
}

// ---------- Shelter dogs ----------

/** What a dog needs from a person, 0-1. Matching compares HumanProfile
 *  traits against these. */
export interface DogNeeds {
  patience: number;
  routineStability: number;
  homePresence: number;
  activityLevel: number;
  noiseTolerance: number;
  dogExperience: number;
}

export interface ShelterDog {
  id: string;
  name: string;
  /** ISO date */
  dob: string;
  breed: string;
  sex: "male" | "female";
  weightKg: number | null;
  vaccines: string;
  neutered: boolean | null;
  /** kennel-card flag color, e.g. "red", "green-yellow" */
  flag: string | null;
  character: string;
  features: string;
  needs: DogNeeds;
  source: "real" | "synthetic";
  /** e.g. "RRSK, Korea" or "San Francisco, CA" */
  location: string;
  /** display distance, e.g. "2.1 mi" */
  distance: string;
  /** path under /public, e.g. "/dogs/campi.jpg" */
  photo: string;
}

// ---------- Matching ----------

export interface MatchResult {
  dog: ShelterDog;
  /** 0-100 */
  score: number;
  reasons: string[];
}

// ---------- Flow state machine ----------

export type FlowState =
  | "connect"
  | "analyzing"
  | "profile"
  | "generating"
  | "dog"
  | "nearby";
