"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import type { MouseEvent } from "react";
import {
  ANALYZING_MS,
  SIGNAL_LABELS,
  SIGNAL_ORDER,
  pct,
  useTimeline,
} from "@/lib/flow";
import type { HumanProfile, RawMergeData } from "@/types";

const CONNECTOR_LABELS: Record<string, string> = {
  "google-calendar": "Calendar",
  slack: "Slack",
  drive: "Drive",
};

const signalVariants: Variants = {
  waiting: (reduceMotion: boolean) => ({
    opacity: 1,
    x: 0,
    transition: { duration: reduceMotion ? 0.18 : 0.3 },
  }),
  revealed: (reduceMotion: boolean) => ({
    opacity: 1,
    x: 0,
    transition: {
      type: reduceMotion ? "tween" : "spring",
      bounce: 0,
      duration: reduceMotion ? 0.18 : 0.42,
    },
  }),
};

/**
 * Pure theater. `profile` is already computed; the timeline only reveals the
 * real signal and trait values, then waits for the user to continue.
 */
export default function AnalyzingScreen({
  raw,
  profile,
  onDone,
  runId,
}: {
  raw: RawMergeData;
  profile: HumanProfile;
  onDone: () => void;
  runId?: number;
}) {
  const signals = SIGNAL_ORDER;
  const reduceMotion = useReducedMotion();
  const { revealed, complete, skip } = useTimeline({
    steps: signals.length,
    totalMs: ANALYZING_MS,
    runId,
  });

  const progress = revealed / signals.length;
  const phase = complete
    ? "Profile ready"
    : progress < 0.18
      ? "Reading your rhythm"
      : progress < 0.58
        ? "Finding patterns"
        : progress < 0.9
          ? "Building your profile"
          : "Finalizing your profile";
  const traitsLive = Math.ceil(progress * profile.traits.length);

  function handleSkip(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    skip();
  }

  return (
    <div className="screen-frame overflow-y-auto">
      <div className="screen-content flex min-h-[100dvh] items-center">
        <div className="grid w-full min-h-[calc(100dvh-8.25rem)] grid-rows-[auto_1fr] gap-5">
          <header className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow mb-2" style={{ color: "var(--ink)" }}>
                Your life, translated
              </p>
              <div className="flex min-h-10 items-center gap-3">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h1
                    key={phase}
                    className="m-0 text-[clamp(2rem,3.15vw,3.35rem)] leading-none font-[710] tracking-[-0.055em] text-[var(--ink)]"
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: 10, filter: "blur(5px)" }
                    }
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -7, filter: "blur(4px)" }
                    }
                    transition={{ duration: reduceMotion ? 0.15 : 0.32 }}
                  >
                    {phase}
                  </motion.h1>
                </AnimatePresence>
                <span className="sr-only" role="status" aria-live="polite">
                  {phase}. {revealed} of {signals.length} signals read.
                  {complete ? " View your profile when you are ready." : ""}
                </span>
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {complete ? (
                <motion.button
                  key="proceed"
                  type="button"
                  onClick={onDone}
                  className="primary-button min-h-10 shrink-0 whitespace-nowrap px-5 text-sm"
                  style={{ color: "var(--ink)" }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  View my profile
                </motion.button>
              ) : (
                <motion.button
                  key="skip"
                  type="button"
                  onClick={handleSkip}
                  className="secondary-button min-h-10 shrink-0 whitespace-nowrap px-5 text-sm"
                  aria-label="Finish the analysis animation now"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Finish now
                </motion.button>
              )}
            </AnimatePresence>
          </header>

          <div className="grid min-h-0 gap-4 md:grid-cols-[minmax(13rem,0.86fr)_minmax(18rem,1.24fr)] xl:grid-cols-[minmax(14rem,0.88fr)_minmax(20rem,1.08fr)_minmax(15rem,0.9fr)]">
            <section
              className="glass-panel order-2 min-h-0 overflow-hidden p-4 md:order-1"
              aria-labelledby="signal-heading"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2
                  id="signal-heading"
                  className="m-0 text-xs font-[680] tracking-[0.02em] text-[rgb(16_35_63/0.86)]"
                >
                  Life signals
                </h2>
                <span className="font-mono text-[0.65rem] font-[620] text-[rgb(16_35_63/0.78)]">
                  {revealed}/{signals.length}
                </span>
              </div>

              <ol className="m-0 grid list-none gap-0 p-0">
                {signals.map((key, index) => {
                  const shown = index < revealed;
                  const value = raw.signals[key].value;

                  return (
                    <motion.li
                      key={key}
                      custom={Boolean(reduceMotion)}
                      variants={signalVariants}
                      initial={
                        reduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, x: -12 }
                      }
                      animate={shown ? "revealed" : "waiting"}
                      className="relative grid min-h-[2.7rem] grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] items-center gap-x-3 gap-y-1 border-b border-[rgb(255_255_255/0.28)] py-1 last:border-b-0"
                    >
                      <p className="m-0 text-[0.64rem] leading-tight font-[620] text-[rgb(16_35_63/0.8)]">
                        {SIGNAL_LABELS[key]}
                      </p>
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={shown ? `value-${key}` : `waiting-${key}`}
                          className="text-right font-mono text-[0.61rem] leading-tight font-[650] text-[var(--ink)]"
                          initial={
                            reduceMotion
                              ? { opacity: 0 }
                              : { opacity: 0, x: 6 }
                          }
                          animate={{ opacity: 1, x: 0 }}
                          exit={
                            reduceMotion
                              ? { opacity: 0 }
                              : { opacity: 0, x: -4 }
                          }
                          transition={{
                            duration: reduceMotion ? 0.14 : 0.22,
                          }}
                        >
                          {shown
                            ? raw.signals[key].raw.replace(/[–—]/g, "-")
                            : "Waiting"}
                        </motion.span>
                      </AnimatePresence>
                      <div
                        className="col-span-2 h-[3px] overflow-hidden rounded-full bg-[rgb(16_35_63/0.1)]"
                        aria-hidden="true"
                      >
                        <motion.div
                          className="h-full origin-left rounded-full bg-[var(--coral)]"
                          initial={false}
                          animate={{ scaleX: shown ? value : 0.025 }}
                          transition={{
                            type: reduceMotion ? "tween" : "spring",
                            bounce: 0,
                            duration: reduceMotion ? 0.18 : 0.52,
                          }}
                        />
                      </div>
                    </motion.li>
                  );
                })}
              </ol>
            </section>

            <section
              className="order-1 flex min-h-[22rem] flex-col items-center justify-center px-2 md:order-2 md:col-span-1 xl:min-h-0"
              aria-labelledby="scanner-heading"
            >
              <h2 id="scanner-heading" className="sr-only">
                Signal scanner
              </h2>

              <div className="mb-4 flex flex-wrap justify-center gap-2">
                {raw.connectors.map((connector, index) => (
                  <motion.span
                    key={connector}
                    className="rounded-full border border-[rgb(255_255_255/0.58)] bg-[rgb(255_255_255/0.3)] px-3 py-1.5 text-[0.64rem] font-[690] tracking-[0.025em] text-[var(--ink)] shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] backdrop-blur-md"
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -7, scale: 0.94 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      type: reduceMotion ? "tween" : "spring",
                      bounce: 0,
                      duration: reduceMotion ? 0.18 : 0.4,
                      delay: reduceMotion ? 0 : index * 0.07,
                    }}
                  >
                    {CONNECTOR_LABELS[connector] ?? connector}
                  </motion.span>
                ))}
              </div>

              <div className="relative flex aspect-square w-[min(31vw,20.5rem)] min-w-[17.5rem] items-center justify-center">
                <motion.div
                  className="absolute inset-[2%] rounded-full border border-dashed border-[rgb(255_255_255/0.58)]"
                  animate={reduceMotion ? undefined : { rotate: 360 }}
                  transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  aria-hidden="true"
                />
                <div
                  className="absolute inset-[8%] rounded-full p-[2px] shadow-[0_26px_80px_rgb(38_83_150/0.2)]"
                  style={{
                    background: `conic-gradient(var(--coral) ${progress * 360}deg, rgb(255 255 255 / 0.24) 0deg)`,
                  }}
                  aria-hidden="true"
                >
                  <div className="h-full w-full rounded-full bg-[rgb(139_183_242/0.9)]" />
                </div>
                <div
                  className="absolute inset-[15%] rounded-full border border-[rgb(255_255_255/0.48)] bg-[rgb(255_255_255/0.22)] shadow-[inset_0_1px_0_rgb(255_255_255/0.6)] backdrop-blur-xl"
                  aria-hidden="true"
                />
                <div
                  className="absolute inset-[27%] rounded-full border border-[rgb(255_255_255/0.64)] bg-[rgb(255_255_255/0.36)] shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_14px_38px_rgb(43_88_154/0.16)]"
                  aria-hidden="true"
                />

                <div
                  className="absolute top-1/2 left-1/2 h-[35%] w-px -translate-x-1/2 -translate-y-full"
                  aria-hidden="true"
                >
                  <motion.div
                    className="h-full w-full origin-bottom bg-gradient-to-t from-[var(--coral)] to-transparent"
                    animate={reduceMotion ? undefined : { rotate: 360 }}
                    transition={{
                      duration: 3.4,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </div>

                {signals.map((key, index) => {
                  const angle = (index / signals.length) * Math.PI * 2;
                  const radius = 45;
                  const shown = index < revealed;
                  return (
                    <span
                      key={key}
                      className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${50 + Math.sin(angle) * radius}%`,
                        top: `${50 - Math.cos(angle) * radius}%`,
                      }}
                      aria-hidden="true"
                    >
                      <motion.span
                        className="block h-full w-full rounded-full border border-[rgb(255_255_255/0.72)]"
                        initial={false}
                        animate={{
                          opacity: shown ? 1 : 0.38,
                          scale: shown && !reduceMotion ? [1, 1.45, 1] : 1,
                          backgroundColor: shown
                            ? "var(--coral)"
                            : "rgb(255 255 255 / 0.28)",
                        }}
                        transition={{
                          scale: { duration: 0.42, times: [0, 0.45, 1] },
                          opacity: { duration: 0.18 },
                          backgroundColor: { duration: 0.18 },
                        }}
                      />
                    </span>
                  );
                })}

                <div
                  className="relative flex flex-col items-center text-center"
                  role="progressbar"
                  aria-label="Analysis progress"
                  aria-valuemin={0}
                  aria-valuemax={signals.length}
                  aria-valuenow={revealed}
                  aria-valuetext={`${revealed} of ${signals.length} signals read`}
                >
                  <motion.span
                    className="font-mono text-[clamp(2rem,3.4vw,3.1rem)] leading-none font-[650] tracking-[-0.07em] text-[var(--ink)]"
                    key={revealed}
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.86 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      type: reduceMotion ? "tween" : "spring",
                      bounce: 0,
                      duration: reduceMotion ? 0.15 : 0.34,
                    }}
                  >
                    {Math.round(progress * 100)}
                  </motion.span>
                  <span className="mt-1 text-[0.61rem] font-[720] tracking-[0.14em] text-[rgb(16_35_63/0.8)] uppercase">
                    percent mapped
                  </span>
                </div>
              </div>

              <p className="mt-3 mb-0 max-w-[26rem] text-center text-xs leading-relaxed font-[540] text-[rgb(16_35_63/0.82)]">
                Reading activity patterns only. Your private content stays
                private.
              </p>
            </section>

            <section
              className="glass-panel order-3 min-h-0 overflow-hidden p-4 md:col-span-2 xl:col-span-1"
              aria-labelledby="trait-heading"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2
                  id="trait-heading"
                  className="m-0 text-xs font-[680] tracking-[0.02em] text-[rgb(16_35_63/0.86)]"
                >
                  Profile instruments
                </h2>
                <span className="font-mono text-[0.65rem] font-[620] text-[rgb(16_35_63/0.78)]">
                  {Math.min(traitsLive, profile.traits.length)}/
                  {profile.traits.length}
                </span>
              </div>

              <ul className="m-0 grid list-none gap-1.5 p-0 md:grid-cols-2 xl:grid-cols-1">
                {profile.traits.map((trait, index) => {
                  const live = index < traitsLive;

                  return (
                    <motion.li
                      key={trait.key}
                      className="rounded-2xl border border-[rgb(255_255_255/0.34)] bg-[rgb(255_255_255/0.16)] px-3 py-2.5"
                      initial={
                        reduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, x: 12 }
                      }
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        type: reduceMotion ? "tween" : "spring",
                        bounce: 0,
                        duration: reduceMotion ? 0.18 : 0.42,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-[0.69rem] font-[650] text-[rgb(16_35_63/0.78)]">
                          {trait.label}
                        </span>
                        <span className="font-mono text-[0.69rem] font-[690] text-[var(--ink)]">
                          {live ? pct(trait.value) : "Resolving"}
                        </span>
                      </div>
                      <div
                        className="mt-2 flex items-center gap-1"
                        aria-hidden="true"
                      >
                        {Array.from({ length: 12 }, (_, tick) => {
                          const active = tick / 11 <= trait.value;
                          return (
                            <motion.span
                              key={tick}
                              className="h-2 flex-1 rounded-full"
                              initial={false}
                              animate={{
                                opacity: live ? (active ? 1 : 0.2) : 0.12,
                                scaleY:
                                  live && active
                                    ? 0.48 + (tick / 11) * 0.52
                                    : 0.34,
                                backgroundColor:
                                  live && active
                                    ? "var(--coral)"
                                    : "rgb(16 35 63 / 0.28)",
                              }}
                              transition={{
                                type: reduceMotion ? "tween" : "spring",
                                bounce: 0,
                                duration: reduceMotion ? 0.16 : 0.36,
                                delay:
                                  reduceMotion || !live ? 0 : tick * 0.015,
                              }}
                            />
                          );
                        })}
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
