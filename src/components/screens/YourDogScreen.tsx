"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import DogViewer from "@/components/DogViewer";
import { describeGenome } from "@/lib/genome";
import type { DogGenome, HumanProfile, TraitKey } from "@/types";

interface Props {
  genome: DogGenome;
  profile: HumanProfile;
  onNext: () => void;
}

type LifestyleAnnotation = {
  id: "rhythm" | "energy" | "home" | "social" | "sensitivity";
  label: string;
  value: number;
  summary: string;
  physicalNote: string;
  anchor: { x: number; y: number };
};

const LEADER_TARGETS: Record<
  LifestyleAnnotation["id"],
  { x: number; y: number }
> = {
  rhythm: { x: 44, y: 31 },
  energy: { x: 58, y: 35 },
  home: { x: 42, y: 53 },
  social: { x: 61, y: 51 },
  sensitivity: { x: 52, y: 66 },
};

function traitValue(profile: HumanProfile, key: TraitKey): number {
  const t = profile.traits.find((x) => x.key === key);
  return t ? t.value : 0.5;
}

const percent = (value: number) => `${Math.round(value * 100)}%`;

function lifestyleAnnotations(
  profile: HumanProfile,
  genome: DogGenome,
): LifestyleAnnotation[] {
  const routine = traitValue(profile, "routineStability");
  const activity = traitValue(profile, "activityLevel");
  const home = traitValue(profile, "homePresence");
  const social = traitValue(profile, "socialDensity");
  const patience = traitValue(profile, "patience");
  const noise = traitValue(profile, "noiseLevel");
  const sensitivity = (patience + (1 - noise)) / 2;

  return [
    {
      id: "rhythm",
      label: "Daily rhythm",
      value: routine,
      summary: `Your routine stability is ${percent(routine)}. ${
        routine > 0.66
          ? "That steady clock points to a dog that anticipates walks and meals."
          : routine > 0.33
            ? "That flexible cadence points to a dog that can settle into a loose pattern."
            : "That changing schedule points to a dog that improvises instead of waiting on the clock."
      }`,
      physicalNote: `The same signal resolves as a ${
        genome.posture > 0.6
          ? "watchful, upright posture"
          : "loose, low posture"
      }.`,
      anchor: { x: 22, y: 19 },
    },
    {
      id: "energy",
      label: "Energy compatibility",
      value: activity,
      summary: `Your activity level is ${percent(activity)}. ${
        activity > 0.66
          ? "That pace predicts a dog that wants distance before it settles."
          : activity > 0.33
            ? "That pace predicts one purposeful walk followed by a calm reset."
            : "That pace predicts a low-mileage companion with a strong off switch."
      }`,
      physicalNote: `Its ${
        genome.legLength > 0.65
          ? "long legs are built to keep pace"
          : genome.legLength < 0.35
            ? "short legs favor measured outings"
            : "balanced legs support a steady stride"
      }.`,
      anchor: { x: 72, y: 18 },
    },
    {
      id: "home",
      label: "Home presence",
      value: home,
      summary: `Your home presence is ${percent(home)}. ${
        home > 0.66
          ? "That much shared time points to a dog that shadows you from room to room."
          : home > 0.33
            ? "That balance points to a dog that enjoys company without needing it every minute."
            : "That time away points to a dog practiced at sleeping through an empty house."
      }`,
      physicalNote: `The profile also produces a ${
        genome.fluffiness > 0.6
          ? "dense, companionable coat"
          : "lighter, lower-maintenance coat"
      }.`,
      anchor: { x: 16, y: 48 },
    },
    {
      id: "social",
      label: "Social environment",
      value: social,
      summary: `Your social density is ${percent(social)}. ${
        social > 0.6
          ? "A people-filled week predicts a dog that works the room."
          : social > 0.35
            ? "A mixed social week predicts a dog that checks in, then chooses its company."
            : "A quieter circle predicts a dog that stays close to your leg in a crowd."
      }`,
      physicalNote: `That social signal shows in a ${
        genome.tailCurl > 0.6 ? "high, expressive curl" : "softly carried tail"
      }.`,
      anchor: { x: 79, y: 47 },
    },
    {
      id: "sensitivity",
      label: "Sensitivity & patience",
      value: sensitivity,
      summary: `Your patience is ${percent(patience)} and household noise is ${percent(noise)}. ${
        sensitivity > 0.62
          ? "Together they point to a sensitive dog that gets time to process before responding."
          : sensitivity > 0.38
            ? "Together they point to a responsive dog that recovers with a clear, even handler."
            : "Together they point to a quick-reacting dog that needs concise cues and active reassurance."
      }`,
      physicalNote: `Its ${
        genome.earDroop > 0.6
          ? "drooping ears soften an alert expression"
          : "lifted ears make every reaction visible"
      }.`,
      anchor: { x: 68, y: 77 },
    },
  ];
}

/** Deterministic temperament blurb from profile traits + genome. No LLM. */
function temperament(profile: HumanProfile, genome: DogGenome): string {
  const activity = traitValue(profile, "activityLevel");
  const home = traitValue(profile, "homePresence");
  const routine = traitValue(profile, "routineStability");
  const noise = traitValue(profile, "noiseLevel");
  const patience = traitValue(profile, "patience");
  const social = traitValue(profile, "socialDensity");

  const parts: string[] = [];

  parts.push(
    activity > 0.66
      ? "This dog runs on the same fuel you do — long days, short recoveries."
      : activity > 0.33
        ? "This dog keeps a steady pace: one real walk, then content to settle."
        : "This dog is built for low mileage and long naps.",
  );

  parts.push(
    home > 0.66
      ? "Because you are home a lot, it stays close and follows you room to room."
      : home > 0.33
        ? "It handles a half-empty house well and greets you loudly when you return."
        : "It is used to your absences and sleeps through most of them.",
  );

  parts.push(
    routine > 0.66
      ? "Your predictable schedule shows up as a dog that knows exactly when dinner is."
      : "Your irregular schedule shows up as a dog that improvises rather than expects.",
  );

  parts.push(
    noise > 0.5
      ? "It is comfortable in noise and joins in with it."
      : "Your calm home leaves room for its big, ringing voice.",
  );

  parts.push(
    patience > 0.6
      ? "It takes correction slowly and forgives yours."
      : "It learns fast and gets impatient with a slow handler.",
  );

  parts.push(
    social > 0.6
      ? "In a crowd it works the room."
      : social > 0.35
        ? "Around people it checks in with everyone, then settles beside its favorite."
        : "In a crowd it stays behind your leg.",
  );

  if (activity < 0.33 && home > 0.66)
    parts.push("On walks, its nose gets the final vote, so patience beats pace.");

  // genome-driven physical/behavioral notes
  if (genome.posture > 0.6) parts.push("It stands alert, ears up, watching.");
  else if (genome.posture < 0.35)
    parts.push("It carries itself loose and low, tail relaxed.");

  if (genome.earDroop > 0.6)
    parts.push("Those droopy ears make it look calmer than it is.");
  if (genome.tailCurl > 0.6) parts.push("The curled tail never stops moving.");
  if (genome.fluffiness > 0.6)
    parts.push("The heavy coat means brushing, and shedding everywhere.");
  if (genome.legLength > 0.65)
    parts.push("Long legs: it will outpace you downhill.");
  else if (genome.legLength < 0.35)
    parts.push("Short legs: stairs and curbs are a project.");

  return parts.join(" ");
}

function temperamentPreview(profile: HumanProfile): string {
  const activity = traitValue(profile, "activityLevel");
  const home = traitValue(profile, "homePresence");
  const routine = traitValue(profile, "routineStability");

  const pace =
    activity < 0.4
      ? "Laid-back, scent-led, and happiest at an easy pace."
      : activity > 0.66
        ? "Bright, energetic, and ready to move with you."
        : "Playful outside, calm once the day settles.";
  const bond =
    home > 0.66
      ? "A devoted companion that wants to stay close."
      : routine > 0.66
        ? "Affectionate and happiest with a familiar rhythm."
        : "Affectionate, adaptable, and comfortable with change.";

  return `${pace} ${bond}`;
}

export default function YourDogScreen({ genome, profile, onNext }: Props) {
  const reduceMotion = useReducedMotion();
  const annotations = lifestyleAnnotations(profile, genome);
  const [selectedId, setSelectedId] =
    useState<LifestyleAnnotation["id"]>("rhythm");
  const [interacting, setInteracting] = useState(false);
  const selected =
    annotations.find((annotation) => annotation.id === selectedId) ??
    annotations[0];
  const phrases = describeGenome(genome);
  const blurb = temperament(profile, genome);
  const preview = temperamentPreview(profile);

  return (
    <div className="screen-frame overflow-y-auto">
      <div className="screen-content flex min-h-[100dvh] items-center">
        <main
          className="grid w-full gap-5 lg:min-h-[calc(100dvh-8.25rem)] lg:grid-cols-[minmax(16.5rem,0.58fr)_minmax(37rem,1.42fr)] lg:items-center lg:gap-[clamp(1.5rem,3.5vw,4rem)]"
          aria-labelledby="your-dog-heading"
        >
          <motion.section
            className="relative z-10 flex flex-col gap-4 lg:max-h-[39rem]"
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, x: -16, filter: "blur(7px)" }
            }
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{
              type: reduceMotion ? "tween" : "spring",
              bounce: 0,
              duration: reduceMotion ? 0.16 : 0.5,
            }}
          >
            <header>
              <p className="eyebrow mb-3" style={{ color: "var(--ink)" }}>
                Your life, embodied
              </p>
              <h1
                id="your-dog-heading"
                className="m-0 max-w-[10ch] text-[clamp(2.45rem,3.9vw,4.65rem)] leading-[0.9] font-[710] tracking-[-0.068em] text-[var(--ink)] text-balance"
              >
                Meet the dog your days shaped.
              </h1>
            </header>

            <section
              className="rounded-[1.5rem_0.7rem_1.5rem_0.7rem] border border-[rgb(255_255_255/0.42)] bg-[rgb(255_255_255/0.16)] px-4 py-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.38)] backdrop-blur-[18px]"
              aria-labelledby="temperament-heading"
            >
              <h2
                id="temperament-heading"
                className="m-0 text-[0.69rem] font-[700] tracking-[0.11em] text-[rgb(16_35_63/0.68)] uppercase"
              >
                Temperament
              </h2>
              <p className="mt-2 mb-0 text-[0.76rem] leading-[1.48] font-[570] text-[rgb(16_35_63/0.84)]">
                {preview}
              </p>
              <details className="group mt-2">
                <summary className="flex min-h-7 cursor-pointer list-none items-center gap-1.5 rounded-md text-[0.66rem] font-[690] text-[var(--ink)] [&::-webkit-details-marker]:hidden">
                  <span>Full temperament</span>
                  <span
                    className="text-sm leading-none transition-transform duration-200 group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-1 mb-0 max-h-[7.4rem] overflow-y-auto pr-1 text-[0.7rem] leading-[1.45] text-[rgb(16_35_63/0.74)]">
                  {blurb}
                </p>
              </details>
            </section>

            <section
              id="dog-detail-panel"
              className="glass-panel min-h-[10.4rem] overflow-hidden rounded-[0.8rem_2rem_0.8rem_2rem] px-4 py-4"
              aria-labelledby="annotation-detail-heading"
              aria-live="polite"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={selected.id}
                  initial={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: 7, filter: "blur(5px)" }
                  }
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -5, filter: "blur(4px)" }
                  }
                  transition={{
                    type: reduceMotion ? "tween" : "spring",
                    bounce: 0,
                    duration: reduceMotion ? 0.12 : 0.32,
                  }}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <h2
                      id="annotation-detail-heading"
                      className="m-0 text-[0.94rem] font-[720] tracking-[-0.03em] text-[var(--ink)]"
                    >
                      {selected.label}
                    </h2>
                    <span className="font-mono text-[0.7rem] font-[700] text-[rgb(16_35_63/0.62)]">
                      {percent(selected.value)}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-[2px] overflow-hidden rounded-full bg-[rgb(16_35_63/0.1)]"
                    aria-hidden="true"
                  >
                    <motion.span
                      className="block h-full origin-left rounded-full bg-[var(--coral)]"
                      style={{ width: percent(selected.value) }}
                      initial={{ scaleX: reduceMotion ? 1 : 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        type: reduceMotion ? "tween" : "spring",
                        bounce: 0,
                        duration: reduceMotion ? 0 : 0.45,
                      }}
                    />
                  </div>
                  <p className="mt-2.5 mb-0 text-[0.73rem] leading-[1.4] text-[rgb(16_35_63/0.82)]">
                    {selected.summary}
                  </p>
                  <p className="mt-1.5 mb-0 text-[0.68rem] leading-[1.35] font-[620] text-[rgb(16_35_63/0.63)]">
                    Physical expression — {selected.physicalNote}
                  </p>
                </motion.div>
              </AnimatePresence>
            </section>

            <motion.button
              type="button"
              className="primary-button self-start whitespace-nowrap px-7"
              onClick={onNext}
              style={
                reduceMotion
                  ? {
                      transform: "none",
                      transition:
                        "background-color 180ms ease, box-shadow 180ms ease",
                    }
                  : undefined
              }
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", bounce: 0, duration: 0.2 }
              }
            >
              See my matches
            </motion.button>
          </motion.section>

          <motion.section
            className="relative h-[min(39rem,calc(100dvh-8.5rem))] min-h-[30rem] overflow-hidden rounded-[3.4rem_1.25rem_3.4rem_1.25rem]"
            aria-label="Interactive model of your generated dog"
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.97, filter: "blur(8px)" }
            }
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{
              type: reduceMotion ? "tween" : "spring",
              bounce: 0,
              duration: reduceMotion ? 0.18 : 0.62,
              delay: reduceMotion ? 0 : 0.06,
            }}
          >
            <div
              className="pointer-events-none absolute inset-[7%_4%_8%] rounded-[50%] bg-[radial-gradient(circle,rgb(255_255_255/0.27),rgb(255_255_255/0.04)_52%,transparent_72%)] blur-[1px]"
              aria-hidden="true"
            />

            <DogViewer
              genome={genome}
              animate
              className="absolute inset-0"
              onInteractingChange={setInteracting}
            />

            <div
              className="pointer-events-none absolute top-5 left-6 flex items-center gap-2 font-mono text-[0.58rem] font-[650] tracking-[0.08em] text-[rgb(16_35_63/0.58)] uppercase"
              aria-hidden="true"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral)] shadow-[0_0_0_4px_rgb(255_87_87/0.13)]" />
              Life model / 05 signals
            </div>

            <div className="pointer-events-none absolute top-5 right-6 text-right">
              <p className="m-0 font-mono text-[0.58rem] font-[680] tracking-[0.08em] text-[rgb(16_35_63/0.58)] uppercase">
                {interacting ? "Orbit engaged" : "Drag to orbit"}
              </p>
              <p className="mt-1 mb-0 max-w-[15rem] overflow-hidden text-ellipsis whitespace-nowrap text-[0.62rem] font-[620] text-[rgb(16_35_63/0.48)]">
                {phrases.join(" · ")}
              </p>
            </div>

            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {annotations.map((annotation) => {
                const target = LEADER_TARGETS[annotation.id];
                const elbowX =
                  annotation.anchor.x < 50 ? target.x - 7 : target.x + 7;
                const active = annotation.id === selected.id;
                return (
                  <motion.polyline
                    key={annotation.id}
                    points={`${annotation.anchor.x},${annotation.anchor.y} ${elbowX},${annotation.anchor.y} ${target.x},${target.y}`}
                    fill="none"
                    stroke={active ? "#ff5757" : "rgba(255,255,255,0.64)"}
                    strokeWidth={active ? 0.32 : 0.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    initial={
                      reduceMotion ? { opacity: 0 } : { pathLength: 0, opacity: 0 }
                    }
                    animate={{ pathLength: 1, opacity: active ? 0.92 : 0.62 }}
                    transition={{
                      type: reduceMotion ? "tween" : "spring",
                      bounce: 0,
                      duration: reduceMotion ? 0.12 : 0.5,
                    }}
                  />
                );
              })}
            </svg>

            <div className="pointer-events-none absolute inset-0">
              {annotations.map((annotation, index) => {
                const active = annotation.id === selected.id;
                const labelOnLeft = annotation.anchor.x < 50;
                return (
                  <motion.button
                    key={annotation.id}
                    type="button"
                    className="group pointer-events-auto absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-transparent p-0"
                    style={{
                      left: `${annotation.anchor.x}%`,
                      top: `${annotation.anchor.y}%`,
                    }}
                    onClick={() => setSelectedId(annotation.id)}
                    aria-pressed={active}
                    aria-controls="dog-detail-panel"
                    aria-label={`${annotation.label}, ${percent(annotation.value)}. Show details`}
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.65 }
                    }
                    animate={
                      reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
                    }
                    transition={{
                      type: reduceMotion ? "tween" : "spring",
                      bounce: 0,
                      duration: reduceMotion ? 0.12 : 0.38,
                      delay: reduceMotion ? 0 : 0.24 + index * 0.055,
                    }}
                  >
                    <span
                      className={[
                        "absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[0.62rem] leading-none font-[680] tracking-[-0.01em] shadow-[0_8px_22px_rgb(34_77_136/0.12)] backdrop-blur-[14px] transition-[background-color,color,border-color] duration-150",
                        labelOnLeft ? "right-[1.7rem]" : "left-[1.7rem]",
                        active
                          ? "border-[rgb(255_255_255/0.7)] bg-[rgb(255_255_255/0.82)] text-[var(--ink)]"
                          : "border-[rgb(255_255_255/0.45)] bg-[rgb(255_255_255/0.28)] text-[rgb(16_35_63/0.72)] group-hover:bg-[rgb(255_255_255/0.48)]",
                      ].join(" ")}
                    >
                      {annotation.label}
                    </span>
                    <span
                      className={[
                        "relative block h-3.5 w-3.5 rounded-full border-[3px] shadow-[0_0_0_5px_rgb(255_255_255/0.14),0_5px_15px_rgb(28_72_130/0.2)] duration-150",
                        reduceMotion
                          ? "transition-[background-color,border-color]"
                          : "transition-[transform,background-color,border-color] group-hover:scale-110",
                        active
                          ? `${reduceMotion ? "" : "scale-110"} border-[var(--coral)] bg-white`
                          : "border-white bg-[rgb(73_130_205/0.72)]",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                  </motion.button>
                );
              })}
            </div>

            <p className="pointer-events-none absolute right-6 bottom-4 m-0 font-mono text-[0.54rem] font-[650] tracking-[0.07em] text-[rgb(16_35_63/0.48)] uppercase">
              Scroll to zoom · select a signal
            </p>
          </motion.section>
        </main>
      </div>
    </div>
  );
}
