"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import type { MouseEvent } from "react";
import {
  GENERATING_MS,
  GENOME_COLOR_KEYS,
  GENOME_LABELS,
  GENOME_NUMERIC_KEYS,
  useTimeline,
} from "@/lib/flow";
import type { DogGenome } from "@/types";

const DOG_PATHS = [
  "M128 168 C153 137 198 123 254 124 C302 125 330 139 355 155",
  "M355 155 C363 137 364 119 374 103 C386 84 416 82 432 100 C441 110 447 126 447 142",
  "M447 142 C461 145 472 153 478 163 C466 174 449 177 429 174 C412 184 392 183 376 171",
  "M391 105 C383 128 383 151 401 163 C380 166 363 153 360 133 C359 117 369 104 391 105",
  "M352 158 C352 192 357 226 354 266 L334 266 C328 233 321 208 311 193",
  "M176 193 C171 218 166 244 169 267 L147 267 C141 235 143 207 153 184",
  "M153 184 C185 210 256 219 311 193",
  "M130 169 C103 160 86 143 82 123 C79 103 92 89 109 91 C128 94 132 113 121 124 C112 133 98 130 94 120",
] as const;

const DOG_NODES = [
  [128, 168],
  [176, 193],
  [254, 124],
  [355, 155],
  [374, 103],
  [432, 100],
  [478, 163],
  [401, 163],
  [354, 266],
  [334, 266],
  [169, 267],
  [147, 267],
  [94, 120],
] as const;

const PROFILE_RAILS = [
  { top: "14%", from: 1 },
  { top: "28%", from: 3 },
  { top: "42%", from: 5 },
  { top: "57%", from: 7 },
  { top: "71%", from: 9 },
  { top: "85%", from: 11 },
] as const;

/**
 * Pure theater. `genome` is ALREADY computed — each parameter settles to its
 * real final value. Nothing is awaited; the transition is gated only on a
 * timer, then holds until the user chooses to continue.
 */
export default function GeneratingScreen({
  genome,
  onDone,
  runId,
}: {
  genome: DogGenome;
  onDone: () => void;
  runId?: number;
}) {
  const steps = GENOME_NUMERIC_KEYS.length + GENOME_COLOR_KEYS.length;
  const reduceMotion = useReducedMotion();
  const { revealed, complete, skip } = useTimeline({
    steps,
    totalMs: GENERATING_MS,
    runId,
  });
  const progress = revealed / steps;
  const phase = complete
    ? "Your dog is ready"
    : progress < 0.25
      ? "Reading your profile"
      : progress < 0.62
        ? "Shaping body and movement"
        : progress < 0.88
          ? "Tuning coat and temperament"
          : "Sealing the final blueprint";

  function handleSkip(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    skip();
  }

  return (
    <div className="screen-frame overflow-y-auto select-none">
      <div className="screen-content flex min-h-[100dvh] items-center">
        <main className="grid min-h-[calc(100dvh-8.25rem)] w-full grid-rows-[auto_1fr] gap-4">
          <header className="flex items-end justify-between gap-6">
            <div className="min-w-0">
              <p className="eyebrow mb-2" style={{ color: "var(--ink)" }}>
                Shepard Cloud Lab
              </p>
              <div className="flex min-h-10 items-center">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h1
                    key={phase}
                    className="m-0 text-[clamp(1.95rem,3.1vw,3.2rem)] leading-none font-[710] tracking-[-0.055em] text-[var(--ink)]"
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: 9, filter: "blur(5px)" }
                    }
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -6, filter: "blur(4px)" }
                    }
                    transition={{ duration: reduceMotion ? 0.12 : 0.3 }}
                  >
                    {phase}
                  </motion.h1>
                </AnimatePresence>
              </div>
              <span className="sr-only" role="status" aria-live="polite">
                {phase}. {revealed} of {steps} genome parameters generated.
                {complete ? " Meet your dog when you are ready." : ""}
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {complete ? (
                <motion.button
                  key="proceed"
                  type="button"
                  onClick={onDone}
                  className="primary-button min-h-10 shrink-0 whitespace-nowrap px-5 text-sm"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  Meet my dog
                </motion.button>
              ) : (
                <motion.button
                  key="skip"
                  type="button"
                  onClick={handleSkip}
                  className="secondary-button min-h-10 shrink-0 whitespace-nowrap px-5 text-sm"
                  aria-label="Finish the dog generation animation now"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Finish now
                </motion.button>
              )}
            </AnimatePresence>
          </header>

          <section
            className="glass-panel relative min-h-[32rem] overflow-hidden px-4 py-4 md:px-5"
            aria-labelledby="lab-heading"
          >
            <div
              className="tech-grid pointer-events-none absolute inset-0 opacity-35"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-x-[18%] top-[-28%] h-[75%] rounded-full bg-[rgb(255_255_255/0.38)] blur-[72px]"
              aria-hidden="true"
            />

            <div className="relative z-10 flex items-center justify-between gap-4 border-b border-[rgb(255_255_255/0.42)] pb-3">
              <div>
                <h2
                  id="lab-heading"
                  className="m-0 text-[0.68rem] font-[720] tracking-[0.13em] text-[var(--ink)] uppercase"
                >
                  Canine blueprint
                </h2>
                <p className="mt-1 mb-0 text-[0.61rem] font-[560] text-[rgb(16_35_63/0.62)]">
                  Profile thread 04 · deterministic build
                </p>
              </div>
              <div
                className="flex items-center gap-3"
                role="progressbar"
                aria-label="Dog generation progress"
                aria-valuemin={0}
                aria-valuemax={steps}
                aria-valuenow={revealed}
                aria-valuetext={`${revealed} of ${steps} genome parameters generated`}
              >
                <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[rgb(16_35_63/0.1)] sm:w-28">
                  <motion.span
                    className="block h-full origin-left rounded-full bg-[var(--coral)]"
                    initial={false}
                    animate={{ scaleX: progress }}
                    transition={{
                      type: reduceMotion ? "tween" : "spring",
                      bounce: 0,
                      duration: reduceMotion ? 0.1 : 0.48,
                    }}
                  />
                </span>
                <span className="w-9 text-right font-mono text-xs font-[690] text-[var(--ink)]">
                  {Math.round(progress * 100)}%
                </span>
              </div>
            </div>

            <div className="relative z-10 grid min-h-[27rem] items-stretch gap-3 pt-3 md:grid-cols-[minmax(9.5rem,0.78fr)_minmax(22rem,1.65fr)_minmax(9.5rem,0.78fr)]">
              <ol className="m-0 grid list-none content-center gap-2 p-0">
                {GENOME_NUMERIC_KEYS.slice(0, 6).map((key, index) => {
                  const live = index < revealed;
                  return (
                    <motion.li
                      key={key}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 border-b border-[rgb(255_255_255/0.34)] py-2"
                      initial={false}
                      animate={{ opacity: live ? 1 : 0.46 }}
                      transition={{ duration: reduceMotion ? 0.1 : 0.24 }}
                    >
                      <span className="text-[0.64rem] leading-tight font-[620] text-[rgb(16_35_63/0.72)]">
                        {GENOME_LABELS[key]}
                      </span>
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={live ? `${key}-live` : `${key}-waiting`}
                          className="font-mono text-[0.65rem] font-[700] text-[var(--ink)]"
                          initial={
                            reduceMotion
                              ? { opacity: 0 }
                              : { opacity: 0, x: -5 }
                          }
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
                        >
                          {live ? genome[key].toFixed(2) : "—"}
                        </motion.span>
                      </AnimatePresence>
                      <span className="col-span-2 mt-1 block h-px overflow-hidden bg-[rgb(16_35_63/0.08)]">
                        <motion.span
                          className="block h-full origin-left bg-[var(--coral)]"
                          initial={false}
                          animate={{
                            scaleX: live ? Math.max(genome[key], 0.03) : 0,
                          }}
                          transition={{
                            duration: reduceMotion ? 0.1 : 0.42,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        />
                      </span>
                    </motion.li>
                  );
                })}
              </ol>

              <div className="relative order-first flex min-h-[22rem] items-center justify-center overflow-hidden rounded-[1.5rem] border border-[rgb(255_255_255/0.44)] bg-[rgb(255_255_255/0.13)] shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] md:order-none">
                <div
                  className="absolute inset-[8%] rounded-[50%] bg-[rgb(202_207_255/0.24)] blur-3xl"
                  aria-hidden="true"
                />

                <div className="pointer-events-none absolute inset-x-[7%] inset-y-[9%]">
                  {PROFILE_RAILS.map((rail) => {
                    const live = revealed >= rail.from;
                    return (
                      <span
                        key={rail.top}
                        className="absolute inset-x-0 flex items-center"
                        style={{ top: rail.top }}
                        aria-hidden="true"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-[rgb(255_255_255/0.76)] bg-[rgb(255_255_255/0.32)]" />
                        <span className="h-px flex-1 overflow-hidden bg-[rgb(255_255_255/0.28)]">
                          <motion.span
                            className="block h-full origin-left bg-[rgb(255_255_255/0.78)]"
                            initial={false}
                            animate={{ scaleX: live ? 1 : 0.08 }}
                            transition={{
                              duration: reduceMotion ? 0.1 : 0.5,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          />
                        </span>
                        <motion.span
                          className="h-1.5 w-1.5 shrink-0 rounded-full border border-[rgb(255_255_255/0.78)]"
                          initial={false}
                          animate={{
                            backgroundColor: live
                              ? "var(--coral)"
                              : "rgb(255 255 255 / 0.28)",
                            scale:
                              live && !reduceMotion ? [1, 1.7, 1] : 1,
                          }}
                          transition={{
                            scale: { duration: 0.38 },
                            backgroundColor: { duration: 0.15 },
                          }}
                        />
                      </span>
                    );
                  })}
                </div>

                <motion.div
                  className="pointer-events-none absolute inset-x-[7%] top-[10%] z-20 h-px bg-[linear-gradient(90deg,transparent,var(--coral),transparent)] shadow-[0_0_14px_rgb(255_87_87/0.68)]"
                  animate={
                    reduceMotion || progress === 1
                      ? { y: "0rem" }
                      : { y: ["0rem", "18rem", "0rem"] }
                  }
                  transition={{
                    duration: reduceMotion || progress === 1 ? 0 : 3.6,
                    repeat: reduceMotion || progress === 1 ? 0 : Infinity,
                    ease: "easeInOut",
                  }}
                  aria-hidden="true"
                />

                <svg
                  className="relative z-10 h-auto w-[94%] max-w-[32rem] overflow-visible"
                  viewBox="40 45 460 245"
                  fill="none"
                  role="img"
                  aria-label={`Dog wireframe blueprint, ${Math.round(progress * 100)} percent complete`}
                >
                  <defs>
                    <filter id="wire-glow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="2.2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <g
                    stroke="rgb(255 255 255 / 0.2)"
                    strokeWidth="1"
                    strokeDasharray="3 7"
                    aria-hidden="true"
                  >
                    <ellipse cx="272" cy="173" rx="173" ry="104" />
                    <line x1="72" y1="173" x2="489" y2="173" />
                    <line x1="272" y1="61" x2="272" y2="279" />
                  </g>

                  <g
                    stroke="rgb(255 255 255 / 0.92)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.15"
                    filter="url(#wire-glow)"
                  >
                    {DOG_PATHS.map((path, index) => {
                      const live =
                        revealed >=
                        Math.ceil(((index + 1) / DOG_PATHS.length) * steps);
                      return (
                        <motion.path
                          key={path}
                          d={path}
                          initial={false}
                          animate={{ pathLength: live ? 1 : 0 }}
                          transition={{
                            duration: reduceMotion ? 0 : 0.7,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        />
                      );
                    })}
                  </g>

                  <g aria-hidden="true">
                    {DOG_NODES.map(([cx, cy], index) => {
                      const live = index < revealed;
                      return (
                        <motion.circle
                          key={`${cx}-${cy}`}
                          cx={cx}
                          cy={cy}
                          r="4"
                          stroke="rgb(255 255 255 / 0.9)"
                          strokeWidth="1.2"
                          initial={false}
                          animate={{
                            opacity: live ? 1 : 0.2,
                            scale:
                              live && !reduceMotion ? [1, 1.75, 1] : 1,
                            fill: live
                              ? "var(--coral)"
                              : "rgb(255 255 255 / 0.18)",
                          }}
                          transition={{
                            scale: { duration: 0.42 },
                            opacity: { duration: 0.15 },
                            fill: { duration: 0.15 },
                          }}
                        />
                      );
                    })}
                  </g>
                </svg>

                <div className="absolute right-4 bottom-3 left-4 z-20 flex items-center justify-between text-[0.56rem] font-[680] tracking-[0.12em] text-[rgb(16_35_63/0.6)] uppercase">
                  <span>Wireframe 04-A</span>
                  <span>{revealed === steps ? "Build sealed" : "Mapping"}</span>
                </div>
              </div>

              <div className="grid content-center gap-2">
                <ol className="m-0 grid list-none gap-2 p-0">
                  {GENOME_NUMERIC_KEYS.slice(6).map((key, offset) => {
                    const index = offset + 6;
                    const live = index < revealed;
                    return (
                      <motion.li
                        key={key}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 border-b border-[rgb(255_255_255/0.34)] py-2"
                        initial={false}
                        animate={{ opacity: live ? 1 : 0.46 }}
                        transition={{ duration: reduceMotion ? 0.1 : 0.24 }}
                      >
                        <span className="text-[0.64rem] leading-tight font-[620] text-[rgb(16_35_63/0.72)]">
                          {GENOME_LABELS[key]}
                        </span>
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={live ? `${key}-live` : `${key}-waiting`}
                            className="font-mono text-[0.65rem] font-[700] text-[var(--ink)]"
                            initial={
                              reduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, x: 5 }
                            }
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: reduceMotion ? 0.1 : 0.2,
                            }}
                          >
                            {live ? genome[key].toFixed(2) : "—"}
                          </motion.span>
                        </AnimatePresence>
                        <span className="col-span-2 mt-1 block h-px overflow-hidden bg-[rgb(16_35_63/0.08)]">
                          <motion.span
                            className="block h-full origin-left bg-[var(--coral)]"
                            initial={false}
                            animate={{
                              scaleX: live
                                ? Math.max(genome[key], 0.03)
                                : 0,
                            }}
                            transition={{
                              duration: reduceMotion ? 0.1 : 0.42,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          />
                        </span>
                      </motion.li>
                    );
                  })}
                </ol>

                <div className="mt-1 grid grid-cols-2 gap-2">
                  {GENOME_COLOR_KEYS.map((key, offset) => {
                    const index = GENOME_NUMERIC_KEYS.length + offset;
                    const live = index < revealed;
                    return (
                      <motion.div
                        key={key}
                        className="rounded-xl border border-[rgb(255_255_255/0.48)] bg-[rgb(255_255_255/0.18)] p-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.45)]"
                        initial={false}
                        animate={{ opacity: live ? 1 : 0.46 }}
                      >
                        <span
                          className="mb-2 block h-5 rounded-md border border-[rgb(255_255_255/0.7)] shadow-[inset_0_1px_0_rgb(255_255_255/0.4)]"
                          style={{
                            backgroundColor: live
                              ? genome[key]
                              : "rgb(255 255 255 / 0.16)",
                          }}
                          aria-hidden="true"
                        />
                        <span className="block truncate text-[0.54rem] font-[650] text-[rgb(16_35_63/0.68)]">
                          {GENOME_LABELS[key]}
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[0.52rem] font-[690] text-[var(--ink)] uppercase">
                          {live ? genome[key] : "—"}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
