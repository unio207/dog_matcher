import type { HumanProfile, MatchResult, ShelterDog, TraitKey } from "@/types";

// Scores each dog by what THE DOG NEEDS FROM A PERSON (DogNeeds), not by
// lifestyle similarity. Every dimension asks one question: does this human
// supply what this dog requires? Two things cost points:
//   - shortfall: the dog needs more than the person has (the real risk)
//   - excess:    the person has far more to give than this dog needs, which
//                means a needier dog is the better placement for them
// Dimensions the dog needs badly are weighted more heavily.

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

function traitValue(profile: HumanProfile, key: TraitKey): number {
  const t = profile.traits.find((x) => x.key === key);
  return t ? t.value : 0.5;
}

type Dim =
  | "patience"
  | "routineStability"
  | "homePresence"
  | "activityLevel"
  | "noiseTolerance"
  | "dogExperience";

const DIMS: Dim[] = [
  "patience",
  "routineStability",
  "homePresence",
  "activityLevel",
  "noiseTolerance",
  "dogExperience",
];

/** Relative importance of each need dimension. Home presence dominates: it is
 *  the one thing an adopter cannot improvise, and activity is next. */
const BASE_WEIGHTS: Record<Dim, number> = {
  patience: 0.12,
  routineStability: 0.1,
  homePresence: 0.3,
  activityLevel: 0.18,
  noiseTolerance: 0.1,
  dogExperience: 0.05,
};

// Penalty slopes, tuned so the five fixture personas land on five distinct dogs.
const SHORT_TEMPERAMENT = 1.3; // missing patience / routine / experience
const SHORT_HOME = 2.7; // missing hours at home — near disqualifying
const SHORT_NOISE = 0.8; // household louder than the dog can take
const EXCESS_TEMPERAMENT = 0.1; // extra patience is almost free
const EXCESS_HOME = 1.3; // hours the dog will not use: someone needier wants them
const EXCESS_EXPERIENCE = 0.6; // an experienced handler on an easy dog is wasted
const EXCESS_ACTIVITY = 0.52; // over-exercising a low-energy dog
const EXCESS_QUIET = 0.9; // a silent house bores a dog that wants a busy one

/** A dimension matters more the more demanding either side is: a big need, or a
 *  big strength the person is looking for somewhere to put. */
const importance = (need: number, supply: number) =>
  0.4 + 0.6 * Math.max(need, supply);

type Fit = { fit: number; dir: "match" | "short" | "excess" };

/** Generic asymmetric fit: shortfall and excess get their own slopes. */
function fit(
  supply: number,
  need: number,
  shortSlope: number,
  excessSlope: number
): Fit {
  const d = supply - need;
  if (d < 0) return { fit: clamp01(1 + d * shortSlope), dir: "short" };
  const f = clamp01(1 - d * excessSlope);
  return { fit: f, dir: f > 0.95 ? "match" : "excess" };
}

/** Energy fit. A shortfall scales with how much the dog needs (a high-energy
 *  dog with a sedentary person is a crisis); excess scales with how LITTLE it
 *  needs (a marathoner should not adopt a dog with weak back legs). */
function energyFit(activity: number, need: number): Fit {
  const d = activity - need;
  if (d < 0)
    return { fit: clamp01(1 + d * (0.5 + 0.5 * need)), dir: "short" };
  const f = clamp01(1 - d * EXCESS_ACTIVITY * (1 - need));
  return { fit: f, dir: f > 0.95 ? "match" : "excess" };
}

/** Noise fit. `tolerance` is what the dog can take, so the dog's requirement is
 *  quiet = 1 - tolerance. Too loud for a sensitive dog is the big penalty; a
 *  silent house for a noise-loving dog is a mild one (nothing ever happens). */
function noiseFit(quiet: number, tolerance: number): Fit {
  const needQuiet = 1 - tolerance;
  if (quiet < needQuiet)
    return { fit: clamp01(1 - SHORT_NOISE * (needQuiet - quiet)), dir: "short" };
  const f = clamp01(1 - EXCESS_QUIET * (quiet - needQuiet) * tolerance);
  return { fit: f, dir: f > 0.95 ? "match" : "excess" };
}

/** Dog-specific clauses so reasons name the real requirement from the kennel
 *  card, not a generic score. Keyed by dog id, then by need dimension. */
const NEED_NOTES: Record<string, Partial<Record<Dim, string>>> = {
  campi: {
    patience: "he can defensively bite if you rush the leash on him",
    routineStability: "he needs the same slow approach every single time",
    homePresence: "he is fine on his own for part of the day",
    activityLevel: "he is young and unneutered, with energy to burn",
    noiseTolerance: "he handles ordinary household noise",
    dogExperience: "he pushes other dogs too hard and can start a fight",
  },
  cinderella: {
    patience: "she is young and still learning, and guards her treats",
    routineStability: "a loose routine is fine for her",
    homePresence: "she does not need you home all day",
    activityLevel: "she is full of energy and wants the playground daily",
    noiseTolerance: "noise does not bother her",
    dogExperience: "she is straightforward to handle",
  },
  sierra: {
    patience: "she is very fearful and needs weeks to warm up to you",
    routineStability: "she only relaxes when the day is predictable",
    homePresence: "she needs someone there while she decides to trust you",
    activityLevel: "playground time, not distance",
    noiseTolerance: "sudden noise sets her weeks of progress back",
    dogExperience: "she has to be held firmly by harness and collar on walks",
  },
  kimbop: {
    patience: "his food gets taken from him, so he has to be fed alone",
    routineStability: "he is still scared and leans on a fixed rhythm",
    homePresence: "he settles only with someone nearby",
    activityLevel: "short careful walks on a firmly held leash",
    noiseTolerance: "he startles easily",
    dogExperience: "he is kind and easy once he trusts you",
  },
  indigo: {
    patience: "he has to be moved slowly, especially outside",
    routineStability: "an unpredictable day makes him bolt for the door",
    homePresence: "he needs someone home to keep him from panicking",
    activityLevel: "careful short outings, nothing sudden",
    noiseTolerance: "he is afraid of loud noises and sudden movement",
    dogExperience: "he escapes through open doors if you are not watching",
  },
  boulder: {
    patience: "if he sits down on a walk you have to wait him out",
    routineStability: "he takes a changing schedule in stride",
    homePresence: "he is fine left alone and mostly sleeps",
    activityLevel: "slow walks only — he refuses to be rushed",
    noiseTolerance: "he does his own barking at night",
    dogExperience: "he is too heavy to lift out of trouble",
  },
  meter: {
    patience: "he warms up to visitors after a few minutes",
    routineStability: "his joint medicine has to come with dinner, every night",
    homePresence: "a senior does better with someone in the house",
    activityLevel: "weak back legs — short walks, long naps, no daily stairs",
    noiseTolerance: "he sleeps through most household noise",
    dogExperience: "he is an easy first dog",
  },
  presidio: {
    patience: "she gets frustrated with people who are slow to play",
    routineStability: "she needs her day to have a shape",
    homePresence: "left bored and alone she chews furniture and digs",
    activityLevel: "she has to run every day, not just walk",
    noiseTolerance: "busy streets and noise do not faze her",
    dogExperience: "she herds children and bicycles and needs real handling",
  },
  sutro: {
    patience: "she counter-surfs and tests the rules",
    routineStability: "she rolls with whatever the day looks like",
    homePresence: "she is happy in a busy house, in or out",
    activityLevel: "she pulls hard and needs the energy burned off",
    noiseTolerance: "she barks at the doorbell and thrives on a loud house",
    dogExperience: "she pulls toward every dog she sees",
  },
  fog: {
    patience: "she is affectionate but stubborn when a scent catches her",
    routineStability: "she relaxes into a familiar, unhurried day",
    homePresence: "she is pack-oriented and dislikes being alone too long",
    activityLevel: "slow sniff-led walks and lots of lounge time are ideal",
    noiseTolerance: "she prefers a calm home but will voice her opinions",
    dogExperience: "food rewards work better than force when she digs in",
  },
};

/** Human-side phrasing per dimension, chosen by how much the person has. */
function humanPhrase(dim: Dim, v: number): string {
  const level = v >= 0.66 ? "high" : v >= 0.34 ? "moderate" : "low";
  switch (dim) {
    case "patience":
      return `your ${level} patience`;
    case "routineStability":
      return level === "high"
        ? "your very steady routine"
        : level === "moderate"
          ? "your mostly steady routine"
          : "your constantly shifting schedule";
    case "homePresence":
      return `your ${level} home presence`;
    case "activityLevel":
      return `your ${level} activity level`;
    case "noiseTolerance":
      return level === "high"
        ? "your quiet home"
        : level === "moderate"
          ? "your fairly quiet home"
          : "your loud, busy home";
    case "dogExperience":
      return `your ${level} hands-on experience`;
  }
}

/** Deterministic tiny epsilon from the dog id so no two dogs can ever tie. */
function idEpsilon(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
  // 0 .. 0.0099 points — far below any meaningful score difference.
  return (h % 100) / 10000;
}

export function match(profile: HumanProfile, dogs: ShelterDog[]): MatchResult[] {
  const patience = traitValue(profile, "patience");
  const routine = traitValue(profile, "routineStability");
  const home = traitValue(profile, "homePresence");
  const activity = traitValue(profile, "activityLevel");
  const noise = traitValue(profile, "noiseLevel");
  const social = traitValue(profile, "socialDensity");

  // How quiet the household actually is: notification/message noise plus how
  // many other people move through it.
  const quiet = clamp01(1 - (0.6 * noise + 0.4 * social));
  // No experience signal exists in the data, so approximate it: patience plus a
  // stable routine is what a reactive or fearful dog actually needs from a
  // handler.
  const experience = clamp01(0.55 * patience + 0.45 * routine);

  const supplies: Record<Dim, number> = {
    patience,
    routineStability: routine,
    homePresence: home,
    activityLevel: activity,
    noiseTolerance: quiet,
    dogExperience: experience,
  };

  const results = dogs.map((dog) => {
    const n = dog.needs;

    const fits: Record<Dim, Fit> = {
      patience: fit(patience, n.patience, SHORT_TEMPERAMENT, EXCESS_TEMPERAMENT),
      routineStability: fit(
        routine,
        n.routineStability,
        SHORT_TEMPERAMENT,
        EXCESS_TEMPERAMENT
      ),
      homePresence: fit(home, n.homePresence, SHORT_HOME, EXCESS_HOME),
      activityLevel: energyFit(activity, n.activityLevel),
      noiseTolerance: noiseFit(quiet, n.noiseTolerance),
      dogExperience: fit(
        experience,
        n.dogExperience,
        SHORT_TEMPERAMENT,
        EXCESS_EXPERIENCE
      ),
    };

    // Importance-weighted average of the six fits.
    let weighted = 0;
    let totalWeight = 0;
    const contrib: { dim: Dim; weight: number; fit: Fit }[] = [];
    for (const dim of DIMS) {
      // The dog's requirement on this axis (noise is stored as tolerance).
      const need = dim === "noiseTolerance" ? 1 - n.noiseTolerance : n[dim];
      const w = BASE_WEIGHTS[dim] * importance(need, supplies[dim]);
      weighted += w * fits[dim].fit;
      totalWeight += w;
      contrib.push({ dim, weight: w, fit: fits[dim] });
    }
    const raw = weighted / totalWeight; // 0-1

    // Map into 8-99.9 so no dog can ever score 0 (or overflow 100 once the
    // epsilon is added).
    const score = Math.round((8 + 91.9 * raw + idEpsilon(dog.id)) * 100) / 100;

    return { dog, score, reasons: buildReasons(dog, supplies, contrib) };
  });

  // Descending. The epsilon guarantees a strict order; id is a final tiebreak.
  return results.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.dog.id.localeCompare(b.dog.id)
  );
}

/** Reasons name BOTH the human trait and the dog's specific requirement:
 *  strengths first, then the sharpest mismatch as an honest caveat. */
function buildReasons(
  dog: ShelterDog,
  supplies: Record<Dim, number>,
  contrib: { dim: Dim; weight: number; fit: Fit }[]
): string[] {
  const notes = NEED_NOTES[dog.id] ?? {};
  const she = dog.sex === "female" ? "she" : "he";
  const note = (dim: Dim) => notes[dim] ?? `${she} needs that from a person`;
  const phrase = (dim: Dim) => cap(humanPhrase(dim, supplies[dim]));

  // Strengths: dimensions the dog cares about that are genuinely covered,
  // ranked by weight * fit so a big need fully met comes first.
  const strengths = contrib
    .filter((c) => c.fit.fit >= 0.85)
    .sort((a, b) => b.weight * b.fit.fit - a.weight * a.fit.fit)
    .slice(0, 2)
    .map(
      (c) =>
        `${phrase(c.dim)} covers ${dog.name}'s need — ${note(c.dim)}.`
    );

  // Mismatches, ranked by how much score they cost. Shortfall and excess get
  // different wording — one is a risk, the other is capacity going unused.
  const gaps = contrib
    .filter((c) => c.fit.fit < 0.85)
    .sort(
      (a, b) => b.weight * (1 - b.fit.fit) - a.weight * (1 - a.fit.fit)
    )
    .slice(0, 2)
    .map((c) =>
      c.fit.dir === "short"
        ? `${phrase(c.dim)} is the stretch here — ${note(c.dim)}.`
        : `${phrase(c.dim)} is more than ${dog.name} will use — ${note(c.dim)}.`
    );

  // Two strengths + one caveat, or fewer strengths + more caveats.
  const reasons = [...strengths, ...gaps.slice(0, strengths.length >= 2 ? 1 : 2)];

  // Guarantee at least two reasons for every dog.
  while (reasons.length < 2) {
    reasons.push(
      reasons.length === 0
        ? `${dog.name} would be work for anyone — the kennel card is honest about that.`
        : `Nothing in your week rules ${dog.name} out, but ${she} will need a plan.`
    );
  }

  return reasons;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
