"use client";

import { motion, useReducedMotion } from "motion/react";
import { pct } from "@/lib/flow";
import type { HumanProfile } from "@/types";

export default function ProfileScreen({
  profile,
  onNext,
}: {
  profile: HumanProfile;
  onNext: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="screen-frame overflow-y-auto">
      <div className="screen-content flex min-h-[100dvh] items-center">
        <main
          className="grid w-full gap-7 lg:min-h-[calc(100dvh-8.25rem)] lg:grid-cols-[minmax(18rem,0.72fr)_minmax(32rem,1.28fr)] lg:items-stretch lg:gap-[clamp(2.5rem,5vw,5.5rem)]"
          aria-labelledby="profile-summary"
        >
          <motion.header
            className="flex flex-col justify-between gap-8 py-1 lg:py-5"
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, x: -18, filter: "blur(7px)" }
            }
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{
              type: reduceMotion ? "tween" : "spring",
              bounce: 0,
              duration: reduceMotion ? 0.18 : 0.52,
            }}
          >
            <div>
              <p className="eyebrow mb-5" style={{ color: "var(--ink)" }}>
                Your life, translated
              </p>
              <h1
                id="profile-summary"
                className="m-0 max-w-[17ch] text-[clamp(2.35rem,3.5vw,4.15rem)] leading-[0.98] font-[690] tracking-[-0.062em] text-[var(--ink)] text-balance"
              >
                {profile.summary}
              </h1>
            </div>

            <motion.button
              type="button"
              onClick={onNext}
              className="primary-button self-start whitespace-nowrap px-7"
              style={{
                color: "var(--ink)",
                transform: reduceMotion ? "none" : undefined,
                transitionProperty: reduceMotion
                  ? "box-shadow, background-color"
                  : undefined,
              }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              transition={{ type: "spring", bounce: 0, duration: 0.2 }}
            >
              Shape my dog
            </motion.button>
          </motion.header>

          <section
            className="glass-panel self-center overflow-hidden px-5 py-3 sm:px-7 lg:w-[min(100%,48rem)] lg:justify-self-end"
            aria-labelledby="traits-heading"
          >
            <h2 id="traits-heading" className="sr-only">
              Your six profile traits
            </h2>

            <ol className="m-0 grid list-none p-0">
              {profile.traits.map((trait, index) => (
                <motion.li
                  key={trait.key}
                  className={[
                    "border-b border-[rgb(255_255_255/0.34)] py-[0.72rem] last:border-b-0",
                    index % 2 === 0
                      ? "pr-[clamp(0rem,3vw,2.5rem)]"
                      : "pl-[clamp(0rem,2.5vw,2rem)]",
                  ].join(" ")}
                  initial={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: index % 2 === 0 ? 18 : -18 }
                  }
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    type: reduceMotion ? "tween" : "spring",
                    bounce: 0,
                    duration: reduceMotion ? 0.16 : 0.44,
                    delay: reduceMotion ? 0 : 0.08 + index * 0.065,
                  }}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4">
                    <h3 className="m-0 text-[0.9rem] leading-none font-[680] tracking-[-0.025em] text-[var(--ink)]">
                      {trait.label}
                    </h3>
                    <span
                      className="font-mono text-[0.72rem] leading-none font-[680] tracking-[-0.035em] text-[rgb(16_35_63/0.7)]"
                      aria-label={`${trait.label}: ${pct(trait.value)}`}
                    >
                      {pct(trait.value)}
                    </span>
                  </div>

                  <div
                    className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-[rgb(16_35_63/0.1)]"
                    aria-hidden="true"
                  >
                    <motion.div
                      className="h-full origin-left rounded-full bg-[var(--coral)]"
                      style={{ width: pct(trait.value) }}
                      initial={{ scaleX: reduceMotion ? 1 : 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        type: reduceMotion ? "tween" : "spring",
                        bounce: 0,
                        duration: reduceMotion ? 0 : 0.68,
                        delay: reduceMotion ? 0 : 0.16 + index * 0.065,
                      }}
                    />
                  </div>

                  <details className="group mt-1.5">
                    <summary
                      className="flex min-h-6 cursor-pointer list-none items-center gap-1.5 rounded-md text-[0.67rem] leading-none font-[650] tracking-[0.01em] text-[var(--ink)] [&::-webkit-details-marker]:hidden"
                      aria-label={`Signals for ${trait.label}`}
                    >
                      <span>Why this score</span>
                      <span
                        className="inline-flex h-4 w-4 items-center justify-center text-[0.82rem] leading-none transition-transform duration-200 group-open:rotate-45"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </summary>
                    <ul className="m-0 grid gap-1.5 pb-1 pt-2 pl-0 text-[0.69rem] leading-[1.35] text-[rgb(16_35_63/0.78)]">
                      {trait.evidence.map((evidence, evidenceIndex) => (
                        <li
                          key={evidenceIndex}
                          className="grid grid-cols-[0.42rem_minmax(0,1fr)] gap-2"
                        >
                          <span
                            className="mt-[0.42rem] h-px bg-[var(--coral)]"
                            aria-hidden="true"
                          />
                          <span>{evidence}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </motion.li>
              ))}
            </ol>
          </section>
        </main>
      </div>
    </div>
  );
}
