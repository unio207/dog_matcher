import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/analyze";
import { describeGenome, toGenome } from "@/lib/genome";
import { match } from "@/lib/match";
import { dogs } from "@/data/dogs";
import { personas, personaIds } from "@/data/fixtures/personas";
import type { PersonaId } from "@/data/fixtures/personas";
import type { MatchResult, TraitKey } from "@/types";

/** Observed (and sensible) top match for each fixture persona. */
const EXPECTED_TOP: Record<PersonaId, string> = {
  // Most active week of the five -> the border collie who must run daily.
  outdoorsy: "presidio",
  // Home all day, very patient -> the whippet who stops eating when alone.
  homebody: "fog",
  // Barely home, no routine -> the dog who is fine left alone and sleeps.
  busyTraveler: "boulder",
  // Quiet, fixed-rhythm home -> the small fearful dog who needs both.
  quietApartment: "kimbop",
  // Loud, crowded, always people -> the lab who thrives on a busy house.
  socialHost: "sutro",
};

const run = (id: PersonaId): MatchResult[] =>
  match(analyze(personas[id]), dogs);

const TRAIT_ORDER: TraitKey[] = [
  "activityLevel",
  "homePresence",
  "routineStability",
  "noiseLevel",
  "patience",
  "socialDensity",
];

describe("analyze", () => {
  it("emits the six traits in TraitKey order with 0-1 values and evidence", () => {
    for (const id of personaIds) {
      const profile = analyze(personas[id]);
      expect(profile.traits.map((t) => t.key)).toEqual(TRAIT_ORDER);
      for (const t of profile.traits) {
        expect(t.value).toBeGreaterThanOrEqual(0);
        expect(t.value).toBeLessThanOrEqual(1);
        expect(t.evidence.length).toBeGreaterThanOrEqual(1);
        expect(t.evidence.length).toBeLessThanOrEqual(3);
        for (const e of t.evidence) expect(e.length).toBeGreaterThan(10);
      }
      expect(profile.summary.length).toBeGreaterThan(20);
    }
  });

  it("is deterministic and pure", () => {
    for (const id of personaIds) {
      expect(analyze(personas[id])).toEqual(analyze(personas[id]));
    }
  });

  it("builds evidence out of the raw signal strings", () => {
    const profile = analyze(personas.outdoorsy);
    const activity = profile.traits.find((t) => t.key === "activityLevel")!;
    expect(activity.evidence[0]).toContain("Weekends packed: hikes, climbing, runs");
  });

  it("separates an active week from a sedentary one", () => {
    const val = (id: PersonaId, key: TraitKey) =>
      analyze(personas[id]).traits.find((t) => t.key === key)!.value;
    expect(val("outdoorsy", "activityLevel")).toBeGreaterThan(
      val("homebody", "activityLevel")
    );
    expect(val("homebody", "homePresence")).toBeGreaterThan(
      val("busyTraveler", "homePresence")
    );
    expect(val("socialHost", "noiseLevel")).toBeGreaterThan(
      val("quietApartment", "noiseLevel")
    );
  });

  it("turns the demo homebody into a Basset-compatible profile and shape", () => {
    const profile = analyze(personas.homebody);
    const values = Object.fromEntries(
      profile.traits.map((trait) => [trait.key, trait.value])
    );

    expect(values).toEqual({
      activityLevel: 0.293,
      homePresence: 0.925,
      routineStability: 0.861,
      noiseLevel: 0.381,
      patience: 0.885,
      socialDensity: 0.501,
    });
    expect(profile.summary).toBe(
      "Your calendar says you are home most of the time and you have unhurried time to give. The thinnest part of your week is activity level — you keep a low-mileage week."
    );
    expect(describeGenome(toGenome(profile))).toEqual(
      expect.arrayContaining([
        "short-legged",
        "long low body",
        "barrel-chested",
        "droopy ears",
        "oversized ears",
        "broad head",
        "short muzzle",
      ])
    );
  });

  it("attributes every demo metric to countable Calendar, Slack, or Drive metadata", () => {
    const signals = personas.homebody.signals;
    const calendar = [
      signals.meetingDensity,
      signals.timeOfDaySpread,
      signals.weekendLoad,
      signals.longestFreeBlock,
      signals.travelGaps,
      signals.groupEventRatio,
    ];
    const slack = [signals.messageVolume, signals.afterHoursActivity];

    for (const signal of calendar) {
      expect(signal.raw).toMatch(/^Google Calendar · .*\d/);
    }
    for (const signal of slack) {
      expect(signal.raw).toMatch(/^Slack · .*\d/);
    }
    expect(signals.fileActivity.raw).toMatch(/^Drive · .*\d/);
  });
});

describe("match", () => {
  it("keeps dog names in a single display language", () => {
    for (const dog of dogs) expect(dog).not.toHaveProperty("nameKo");
  });

  it("gives each persona its expected top dog", () => {
    for (const id of personaIds) {
      expect(run(id)[0].dog.id, `persona ${id}`).toBe(EXPECTED_TOP[id]);
    }
  });

  it("gives the five personas five distinct top dogs", () => {
    const tops = personaIds.map((id) => run(id)[0].dog.id);
    expect(new Set(tops).size).toBe(personaIds.length);
  });

  it("scores every dog, never zero, never above 100", () => {
    for (const id of personaIds) {
      const results = run(id);
      expect(results).toHaveLength(dogs.length);
      for (const r of results) {
        expect(r.score, `${id}/${r.dog.id}`).toBeGreaterThan(0);
        expect(r.score, `${id}/${r.dog.id}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("never ties at the top and returns results sorted descending", () => {
    for (const id of personaIds) {
      const results = run(id);
      expect(results[0].score).toBeGreaterThan(results[1].score);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
      // No two dogs share a score at all (id epsilon).
      expect(new Set(results.map((r) => r.score)).size).toBe(results.length);
    }
  });

  it("gives every result at least two reasons naming the dog", () => {
    for (const id of personaIds) {
      for (const r of run(id)) {
        expect(r.reasons.length, `${id}/${r.dog.id}`).toBeGreaterThanOrEqual(2);
        // Each reason ties a human trait to this dog's requirement.
        expect(r.reasons.some((x) => x.includes(r.dog.name))).toBe(true);
        for (const reason of r.reasons) expect(reason.length).toBeGreaterThan(30);
      }
    }
  });

  it("is deterministic", () => {
    for (const id of personaIds) expect(run(id)).toEqual(run(id));
  });

  it("prefers the high-energy dog for the active persona over the senior", () => {
    const results = run("outdoorsy");
    const score = (dogId: string) =>
      results.find((r) => r.dog.id === dogId)!.score;
    expect(score("presidio")).toBeGreaterThan(score("meter"));
  });

  it("penalizes the low-presence persona on dogs that need company", () => {
    const results = run("busyTraveler");
    const score = (dogId: string) =>
      results.find((r) => r.dog.id === dogId)!.score;
    // Fog stops eating when alone; Boulder is fine alone.
    expect(score("boulder")).toBeGreaterThan(score("fog"));
  });
});
