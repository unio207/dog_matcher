import type { DogGenome, HumanProfile, TraitKey } from "@/types";

// Deterministic HumanProfile -> DogGenome mapping.
// No randomness anywhere: the same profile always yields the same dog.

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Pull trait values into a flat record. Missing traits default to 0.5. */
function traitValues(profile: HumanProfile): Record<TraitKey, number> {
  const v: Record<TraitKey, number> = {
    activityLevel: 0.5,
    homePresence: 0.5,
    routineStability: 0.5,
    noiseLevel: 0.5,
    patience: 0.5,
    socialDensity: 0.5,
  };
  for (const t of profile.traits) {
    if (t.key in v) v[t.key] = clamp01(t.value);
  }
  return v;
}

/** Push a 0-1 value away from the middle so personas separate visually. */
function contrast(n: number, k = 1.35): number {
  const x = clamp01(n);
  const s = x < 0.5 ? 0.5 * Math.pow(x * 2, k) : 1 - 0.5 * Math.pow((1 - x) * 2, k);
  return clamp01(s);
}

/** Coat palettes, ordered cool/dark -> warm/light. */
const PALETTE: { coat: string; accent: string; accentAlt: string; name: string }[] = [
  { coat: "#2f2b2a", accent: "#a8763c", accentAlt: "#d8c9ae", name: "black-and-tan" },
  { coat: "#4a4a52", accent: "#cfcfd6", accentAlt: "#9aa0aa", name: "slate grey" },
  { coat: "#7d6a58", accent: "#e3d4bd", accentAlt: "#b79a76", name: "mushroom brown" },
  { coat: "#a4562c", accent: "#e8c9a0", accentAlt: "#f2e0c4", name: "red-brown" },
  { coat: "#c8965a", accent: "#f3e3c8", accentAlt: "#e6c79b", name: "warm tan" },
  { coat: "#e6d3ae", accent: "#fbf3e2", accentAlt: "#d9bf93", name: "cream" },
];

/** Deterministic palette pick: warmth axis chooses coat, socialDensity chooses accent. */
function pickColors(t: Record<TraitKey, number>) {
  const warmth = clamp01(
    0.45 * t.patience + 0.3 * t.homePresence + 0.25 * (1 - t.noiseLevel),
  );
  let idx = Math.floor(warmth * PALETTE.length);
  if (idx >= PALETTE.length) idx = PALETTE.length - 1;
  // Unstable routines nudge one shade darker so those personas read differently.
  if (t.routineStability < 0.3 && idx > 0) idx -= 1;
  const entry = PALETTE[idx];
  return {
    coatColor: entry.coat,
    accentColor: t.socialDensity > 0.6 ? entry.accentAlt : entry.accent,
  };
}

export function toGenome(profile: HumanProfile): DogGenome {
  const t = traitValues(profile);

  const act = contrast(t.activityLevel);
  const home = contrast(t.homePresence);
  const noise = contrast(t.noiseLevel);
  const pat = contrast(t.patience);
  const social = contrast(t.socialDensity);
  const routine = t.routineStability;

  // Active people get leggy, upright, alert dogs; homebodies get long, low, round ones.
  const legLength = clamp01(0.06 + 0.9 * act);
  const bodyLength = clamp01(0.78 - 0.62 * act + 0.28 * home);
  const bodyHeight = clamp01(0.12 + 0.55 * home + 0.3 * (1 - act));
  const posture = clamp01(0.05 + 0.5 * act + 0.28 * noise + 0.14 * routine);

  // Quiet homes -> droopy, soft ears. Loud/busy -> perked, upright.
  const earDroop = clamp01(0.95 - 0.7 * noise - 0.22 * act);
  const earSize = clamp01(0.15 + 0.45 * earDroop + 0.35 * home);

  // Patience -> big round head, short snout.
  const headSize = clamp01(0.15 + 0.75 * pat);
  const snoutLength = clamp01(0.92 - 0.75 * pat);

  // Social density -> long, tightly curled tail.
  const tailLength = clamp01(0.12 + 0.45 * act + 0.42 * social);
  const tailCurl = clamp01(0.03 + 0.9 * social);

  // Time at home -> thick coat.
  const fluffiness = clamp01(0.05 + 0.72 * home + 0.22 * (1 - act));

  const { coatColor, accentColor } = pickColors(t);

  return {
    bodyLength,
    bodyHeight,
    legLength,
    headSize,
    earDroop,
    earSize,
    snoutLength,
    tailLength,
    tailCurl,
    coatColor,
    accentColor,
    fluffiness,
    posture,
  };
}

/** Readable trait phrases for the genome, for UI display. */
export function describeGenome(genome: DogGenome): string[] {
  const out: string[] = [];

  if (genome.legLength > 0.7) out.push("long-legged");
  else if (genome.legLength < 0.3) out.push("short-legged");
  else out.push("medium build");

  if (genome.bodyLength > 0.7) out.push("long low body");
  else if (genome.bodyLength < 0.3) out.push("compact body");

  if (genome.bodyHeight > 0.7) out.push("barrel-chested");
  else if (genome.bodyHeight < 0.25) out.push("lean frame");

  if (genome.earDroop > 0.65) out.push("droopy ears");
  else if (genome.earDroop < 0.3) out.push("upright ears");
  else out.push("half-folded ears");

  if (genome.earSize > 0.7) out.push("oversized ears");
  else if (genome.earSize < 0.25) out.push("small neat ears");

  if (genome.headSize > 0.7) out.push("broad head");
  else if (genome.headSize < 0.3) out.push("fine-boned head");

  if (genome.snoutLength > 0.65) out.push("long snout");
  else if (genome.snoutLength < 0.3) out.push("short muzzle");

  if (genome.tailCurl > 0.65) out.push("tightly curled tail");
  else if (genome.tailCurl < 0.25) out.push("straight tail");
  else out.push("gently curved tail");

  if (genome.tailLength > 0.7) out.push("long plume tail");
  else if (genome.tailLength < 0.25) out.push("stubby tail");

  if (genome.fluffiness > 0.7) out.push("thick coat");
  else if (genome.fluffiness > 0.4) out.push("medium coat");
  else out.push("sleek coat");

  if (genome.posture > 0.7) out.push("alert stance");
  else if (genome.posture < 0.3) out.push("relaxed stance");

  const swatch = PALETTE.find((p) => p.coat === genome.coatColor);
  if (swatch) out.push(`${swatch.name} coat`);

  return out;
}
