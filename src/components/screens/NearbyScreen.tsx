"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { HumanProfile, MatchResult, ShelterDog } from "@/types";

interface Props {
  profile: HumanProfile;
  matches: MatchResult[];
  onRestart: () => void;
}

type ExplanationStatus = "loading" | "ready" | "unavailable";

const MAP_PIN_POSITIONS = [
  { top: "20%", left: "24%" },
  { top: "54%", left: "64%" },
  { top: "72%", left: "31%" },
  { top: "27%", left: "76%" },
] as const;

/** years + months from an ISO dob, relative to now. */
function ageFromDob(dob: string): string {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "age unknown";
  const now = new Date();
  let months =
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  if (months < 0) months = 0;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}

function DogPhoto({
  dog,
  className,
  priority = false,
}: {
  dog: ShelterDog;
  className: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !dog.photo) {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center bg-[linear-gradient(145deg,rgb(218_231_249/0.92),rgb(245_242_236/0.78))] text-center text-[var(--ink)]`}
        role="img"
        aria-label={`Photo unavailable for ${dog.name}`}
      >
        <span
          className="text-[clamp(2.8rem,6vw,5.6rem)] leading-none font-[690] tracking-[-0.07em] opacity-35"
          aria-hidden="true"
        >
          {dog.name.charAt(0)}
        </span>
        <span className="mt-2 text-[0.65rem] font-[680] tracking-[0.08em] uppercase">
          Photo unavailable
        </span>
      </div>
    );
  }

  return (
    // Dynamic shelter paths need an on-error fallback, so a native image is
    // retained rather than hiding failed responses behind image optimization.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dog.photo}
      alt={`${dog.name}, ${dog.breed}`}
      className={`${className} object-cover`}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setFailed(true)}
    />
  );
}

function ScoreRing({
  score,
  compact = false,
}: {
  score: number;
  compact?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const roundedScore = Math.round(score);

  return (
    <motion.div
      className={[
        "relative grid shrink-0 place-items-center rounded-full p-[4px] shadow-[0_14px_34px_rgb(39_82_144/0.16)]",
        compact ? "h-[3.2rem] w-[3.2rem]" : "h-[5.15rem] w-[5.15rem]",
      ].join(" ")}
      style={{
        background: `conic-gradient(var(--coral) ${Math.min(
          100,
          Math.max(0, roundedScore),
        )}%, rgb(255 255 255 / 0.34) 0)`,
      }}
      initial={
        reduceMotion ? false : { opacity: 0, scale: 0.76, rotate: -46 }
      }
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{
        type: reduceMotion ? "tween" : "spring",
        bounce: 0,
        duration: reduceMotion ? 0.16 : 0.64,
        delay: reduceMotion ? 0 : 0.22,
      }}
      role="img"
      aria-label={`${roundedScore}% match`}
    >
      <div className="grid h-full w-full place-items-center rounded-full border border-[rgb(255_255_255/0.64)] bg-[rgb(237_245_254/0.94)] shadow-[inset_0_1px_0_rgb(255_255_255/0.92)]">
        <span
          className={[
            "font-mono leading-none font-[730] tracking-[-0.07em] text-[var(--ink)]",
            compact ? "text-[0.86rem]" : "text-[1.32rem]",
          ].join(" ")}
          aria-hidden="true"
        >
          {roundedScore}
          <span
            className={
              compact ? "ml-px text-[0.5rem]" : "ml-0.5 text-[0.68rem]"
            }
          >
            %
          </span>
        </span>
      </div>
    </motion.div>
  );
}

function DecorativeMap({ matches }: { matches: MatchResult[] }) {
  return (
    <section
      className="glass-panel relative min-h-[17rem] min-w-0 overflow-hidden rounded-[1.75rem] p-4 lg:h-full"
      aria-labelledby="area-preview-heading"
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p
            id="area-preview-heading"
            className="m-0 text-[0.72rem] font-[720] tracking-[-0.015em] text-[var(--ink)]"
          >
            Area preview
          </p>
          <p className="mt-1 mb-0 max-w-[17rem] text-[0.62rem] leading-[1.35] font-[560] text-[rgb(16_35_63/0.68)]">
            Illustrative only. Pins do not show live shelter locations.
          </p>
        </div>
        <span className="rounded-full border border-[rgb(255_255_255/0.62)] bg-[rgb(255_255_255/0.38)] px-2.5 py-1 text-[0.58rem] font-[690] text-[rgb(16_35_63/0.72)]">
          Not live
        </span>
      </div>

      <div
        className="absolute inset-x-3 bottom-3 top-[4.8rem] overflow-hidden rounded-[1.3rem] border border-[rgb(255_255_255/0.52)] bg-[rgb(210_229_250/0.54)] shadow-[inset_0_1px_0_rgb(255_255_255/0.58)]"
        aria-hidden="true"
      >
        <div className="absolute -left-[14%] top-[31%] h-8 w-[92%] rotate-[13deg] rounded-full border-y border-[rgb(255_255_255/0.64)] bg-[rgb(255_255_255/0.2)]" />
        <div className="absolute -right-[20%] top-[49%] h-7 w-[104%] -rotate-[27deg] rounded-full border-y border-[rgb(255_255_255/0.58)] bg-[rgb(255_255_255/0.18)]" />
        <div className="absolute left-[44%] -top-[25%] h-[145%] w-8 rotate-[8deg] rounded-full border-x border-[rgb(255_255_255/0.58)] bg-[rgb(255_255_255/0.16)]" />
        <div className="absolute -bottom-[35%] -left-[8%] h-[82%] w-[48%] rounded-full border border-[rgb(108_157_222/0.25)] bg-[rgb(126_177_232/0.2)]" />
        <div className="absolute -right-[12%] -top-[25%] h-[70%] w-[54%] rounded-full border border-[rgb(255_255_255/0.5)] bg-[rgb(245_242_236/0.18)]" />

        {matches.slice(0, MAP_PIN_POSITIONS.length).map((match, index) => {
          const position = MAP_PIN_POSITIONS[index];
          return (
            <motion.div
              key={match.dog.id}
              className="absolute flex items-center gap-1.5"
              style={position}
              initial={{ opacity: 0, scale: 0.72, y: 7 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: "spring",
                bounce: 0,
                duration: 0.42,
                delay: 0.12 + index * 0.07,
              }}
            >
              <span className="h-3 w-3 rounded-full border-[3px] border-[rgb(245_242_236/0.92)] bg-[var(--coral)] shadow-[0_5px_12px_rgb(39_82_144/0.2)]" />
              <span className="max-w-[6.8rem] truncate rounded-full border border-[rgb(255_255_255/0.74)] bg-[rgb(240_247_255/0.9)] px-2 py-1 text-[0.56rem] leading-none font-[700] text-[var(--ink)] shadow-[0_6px_18px_rgb(39_82_144/0.12)]">
                {match.dog.name}
              </span>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function MatchMeta({ dog }: { dog: ShelterDog }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.67rem] leading-none font-[610] text-[rgb(16_35_63/0.7)]">
      <span>{dog.breed}</span>
      <span className="h-3 w-px bg-[rgb(16_35_63/0.2)]" aria-hidden="true" />
      <span>{ageFromDob(dog.dob)}</span>
      <span className="h-3 w-px bg-[rgb(16_35_63/0.2)]" aria-hidden="true" />
      <span>{dog.distance}</span>
      <span className="h-3 w-px bg-[rgb(16_35_63/0.2)]" aria-hidden="true" />
      <span>{dog.location}</span>
    </div>
  );
}

function TopMatch({
  match,
  explanation,
  explanationStatus,
}: {
  match: MatchResult;
  explanation: string | null;
  explanationStatus: ExplanationStatus;
}) {
  const reduceMotion = useReducedMotion();
  const { dog } = match;

  return (
    <motion.article
      className="glass-panel grid min-h-[29rem] min-w-0 max-w-full overflow-hidden rounded-[1.75rem] p-2.5 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:h-full lg:min-h-0"
      initial={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 18, scale: 0.975, filter: "blur(7px)" }
      }
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{
        type: reduceMotion ? "tween" : "spring",
        bounce: 0,
        duration: reduceMotion ? 0.16 : 0.58,
      }}
      aria-labelledby={`top-match-${dog.id}`}
    >
      <div className="relative min-h-[16rem] overflow-hidden rounded-[1.3rem]">
        <DogPhoto dog={dog} className="absolute inset-0 h-full w-full" priority />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[rgb(16_35_63/0.42)] to-transparent"
          aria-hidden="true"
        />
        <span className="absolute bottom-3 left-3 rounded-full border border-[rgb(255_255_255/0.52)] bg-[rgb(16_35_63/0.5)] px-3 py-1.5 text-[0.6rem] font-[710] tracking-[0.04em] text-white backdrop-blur-md">
          Best match
        </span>
      </div>

      <div className="flex min-w-0 flex-col px-3 py-3 sm:px-4 lg:overflow-y-auto lg:px-5 lg:py-4">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id={`top-match-${dog.id}`}
              className="m-0 text-[clamp(2rem,3.1vw,3.3rem)] leading-[0.9] font-[720] tracking-[-0.065em] text-[var(--ink)]"
            >
              {dog.name}
            </h2>
          </div>
          <ScoreRing score={match.score} />
        </header>

        <div className="mt-3">
          <MatchMeta dog={dog} />
        </div>

        <p className="mt-3 mb-0 text-[0.7rem] leading-[1.42] font-[590] text-[rgb(16_35_63/0.82)]">
          {match.reasons[0]}
        </p>

        <details className="group mt-3 border-t border-[rgb(255_255_255/0.42)] pt-2.5">
          <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 rounded-lg text-[0.67rem] font-[720] tracking-[0.055em] text-[var(--ink)] uppercase [&::-webkit-details-marker]:hidden">
            <span>Why this match</span>
            <span
              className="grid h-6 w-6 place-items-center rounded-full border border-[rgb(255_255_255/0.54)] bg-white/20 text-base leading-none transition-transform duration-200 group-open:rotate-45"
              aria-hidden="true"
            >
              +
            </span>
          </summary>

          <div className="pb-1 pt-2">
            {match.reasons.length > 1 && (
              <ul className="m-0 grid list-none gap-1.5 p-0">
                {match.reasons.slice(1).map((reason) => (
                  <li
                    key={reason}
                    className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-2 text-[0.68rem] leading-[1.4] text-[rgb(16_35_63/0.78)]"
                  >
                    <span
                      className="mt-[0.42rem] h-[2px] w-3 rounded-full bg-[var(--coral)]"
                      aria-hidden="true"
                    />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-3 mb-0 text-[0.68rem] leading-[1.45] text-[rgb(16_35_63/0.72)]">
              {dog.character}
            </p>
            <p className="mt-2 mb-0 text-[0.66rem] leading-[1.42] font-[620] text-[rgb(16_35_63/0.64)]">
              Care note — {dog.features}
            </p>

            <div
              className="mt-3 rounded-xl bg-white/15 px-3 py-2.5"
              role="status"
              aria-live="polite"
              aria-busy={explanationStatus === "loading"}
            >
              <p className="m-0 text-[0.59rem] font-[720] tracking-[0.075em] text-[rgb(16_35_63/0.6)] uppercase">
                Shepard&apos;s note
              </p>
              {explanationStatus === "loading" && (
                <div
                  className="mt-2 grid gap-1.5"
                  aria-label="Preparing explanation"
                >
                  <motion.span
                    className="h-2 w-full origin-left rounded-full bg-[rgb(255_255_255/0.42)]"
                    animate={
                      reduceMotion
                        ? undefined
                        : { opacity: [0.45, 0.9, 0.45] }
                    }
                    transition={{
                      duration: 1.3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <motion.span
                    className="h-2 w-2/3 origin-left rounded-full bg-[rgb(255_255_255/0.38)]"
                    animate={
                      reduceMotion ? undefined : { opacity: [0.4, 0.8, 0.4] }
                    }
                    transition={{
                      duration: 1.3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.12,
                    }}
                  />
                  <span className="sr-only">
                    Preparing your personal match note.
                  </span>
                </div>
              )}
              {explanationStatus === "ready" && explanation && (
                <motion.p
                  className="mt-1.5 mb-0 text-[0.68rem] leading-[1.42] font-[570] text-[var(--ink)]"
                  initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0.14 : 0.3 }}
                >
                  {explanation}
                </motion.p>
              )}
              {explanationStatus === "unavailable" && (
                <p className="mt-1.5 mb-0 text-[0.67rem] leading-[1.42] text-[rgb(16_35_63/0.72)]">
                  Your profile scores still explain the fit.
                </p>
              )}
            </div>
          </div>
        </details>
      </div>
    </motion.article>
  );
}

function CompactMatchCard({
  match,
  index,
}: {
  match: MatchResult;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  const { dog } = match;

  return (
    <motion.article
      className="grid h-[10.6rem] w-[19.5rem] shrink-0 grid-cols-[7.1rem_minmax(0,1fr)] overflow-hidden rounded-[1.5rem] border border-[rgb(255_255_255/0.52)] bg-[rgb(255_255_255/0.2)] p-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_14px_34px_rgb(40_84_145/0.12)] backdrop-blur-[20px]"
      initial={
        reduceMotion ? { opacity: 0 } : { opacity: 0, x: 18, scale: 0.97 }
      }
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        type: reduceMotion ? "tween" : "spring",
        bounce: 0,
        duration: reduceMotion ? 0.14 : 0.44,
        delay: reduceMotion ? 0 : 0.12 + Math.min(index, 5) * 0.055,
      }}
      aria-labelledby={`match-${dog.id}`}
    >
      <DogPhoto
        dog={dog}
        className="h-full min-h-0 w-full rounded-[1.08rem]"
      />
      <div className="flex min-w-0 flex-col px-2.5 py-1">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              id={`match-${dog.id}`}
              className="m-0 truncate text-[1rem] leading-none font-[710] tracking-[-0.04em] text-[var(--ink)]"
            >
              {dog.name}
            </h3>
          </div>
          <ScoreRing score={match.score} compact />
        </header>

        <p className="mt-1.5 mb-0 truncate text-[0.61rem] font-[620] text-[rgb(16_35_63/0.68)]">
          {dog.breed} / {ageFromDob(dog.dob)} / {dog.distance}
        </p>
        <p className="mt-1 mb-0 truncate text-[0.58rem] font-[560] text-[rgb(16_35_63/0.58)]">
          {dog.location}
        </p>
        <p
          className="mt-2 mb-0 line-clamp-2 text-[0.6rem] leading-[1.4] text-[rgb(16_35_63/0.76)]"
          title={match.reasons[0]}
        >
          {match.reasons[0]}
        </p>
      </div>
    </motion.article>
  );
}

export default function NearbyScreen({ profile, matches, onRestart }: Props) {
  const reduceMotion = useReducedMotion();
  const ranked = [...matches].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const rest = ranked.slice(1);

  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationStatus, setExplanationStatus] =
    useState<ExplanationStatus>("loading");

  useEffect(() => {
    if (!top) return;
    let cancelled = false;
    setExplanation(null);
    setExplanationStatus("loading");

    (async () => {
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, dog: top.dog }),
        });
        const data = (await res.json()) as { explanation?: string };
        if (cancelled) return;
        if (data?.explanation) {
          setExplanation(data.explanation);
          setExplanationStatus("ready");
        } else {
          setExplanationStatus("unavailable");
        }
      } catch (error) {
        console.error("[NearbyScreen] explain fetch failed", error);
        if (!cancelled) setExplanationStatus("unavailable");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, top]);

  if (!top) {
    return (
      <div className="screen-frame overflow-y-auto">
        <div className="screen-content flex min-h-[100dvh] items-center justify-center">
          <motion.main
            className="glass-panel w-full max-w-[36rem] rounded-[1.75rem] p-8 text-center"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.14 : 0.4 }}
          >
            <p className="eyebrow mb-3" style={{ color: "var(--ink)" }}>
              Matches unavailable
            </p>
            <h1 className="m-0 text-[clamp(2rem,4vw,3.25rem)] leading-[0.96] font-[710] tracking-[-0.06em] text-[var(--ink)]">
              No dogs are ready to compare.
            </h1>
            <p className="mx-auto mt-4 mb-0 max-w-[30rem] text-sm leading-relaxed text-[rgb(16_35_63/0.72)]">
              Start again to refresh your profile and look for available
              matches.
            </p>
            <button
              type="button"
              className="primary-button mt-6 whitespace-nowrap px-7"
              style={{ color: "var(--ink)" }}
              onClick={onRestart}
            >
              Start over
            </button>
          </motion.main>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-frame overflow-y-auto">
      <div className="screen-content flex min-h-[100dvh] items-center">
        <main
          className="grid min-w-0 w-full max-w-full gap-3.5 lg:min-h-[calc(100dvh-8.25rem)] lg:grid-rows-[auto_minmax(20rem,1fr)_auto]"
          aria-labelledby="nearby-heading"
        >
          <motion.header
            className="flex items-end justify-between gap-5"
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -10, filter: "blur(5px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              type: reduceMotion ? "tween" : "spring",
              bounce: 0,
              duration: reduceMotion ? 0.15 : 0.48,
            }}
          >
            <div>
              <p className="eyebrow mb-2" style={{ color: "var(--ink)" }}>
                Your strongest fit
              </p>
              <h1
                id="nearby-heading"
                className="m-0 text-[clamp(2.05rem,3.55vw,4rem)] leading-[0.9] font-[720] tracking-[-0.065em] text-[var(--ink)]"
              >
                Someone worth meeting.
              </h1>
            </div>
            <button
              type="button"
              className="secondary-button min-h-10 shrink-0 whitespace-nowrap px-4 text-[0.72rem]"
              onClick={onRestart}
            >
              Start over
            </button>
          </motion.header>

          <div className="grid min-h-0 min-w-0 gap-3.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,5fr)]">
            <DecorativeMap matches={ranked} />
            <TopMatch
              match={top}
              explanation={explanation}
              explanationStatus={explanationStatus}
            />
          </div>

          {rest.length > 0 && (
            <section
              className="min-w-0 max-w-full"
              aria-labelledby="more-matches-heading"
            >
              <div className="mb-2 flex items-center justify-between gap-4">
                <h2
                  id="more-matches-heading"
                  className="m-0 text-[0.78rem] font-[710] tracking-[-0.02em] text-[var(--ink)]"
                >
                  More compatible dogs
                </h2>
                <span className="text-[0.61rem] font-[620] text-[rgb(16_35_63/0.64)]">
                  Ranked by fit
                </span>
              </div>
              <div
                className="-mx-1 flex min-w-0 max-w-full snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-2 [scrollbar-color:rgb(255_255_255/0.48)_transparent] [scrollbar-width:thin]"
                tabIndex={0}
                aria-label={`${rest.length} more compatible dogs, ranked from highest to lowest match`}
              >
                {rest.map((match, index) => (
                  <div key={match.dog.id} className="snap-start">
                    <CompactMatchCard match={match} index={index} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
