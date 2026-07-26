"use client";

import Image from "next/image";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { FLOW_STATES } from "@/lib/flow";
import type { FlowState } from "@/types";

const STEP_LABELS: Record<FlowState, string> = {
  connect: "Connect",
  analyzing: "Analyze",
  profile: "Profile",
  generating: "Create",
  dog: "Meet",
  nearby: "Match",
};

export default function FlowShell({
  state,
  children,
}: {
  state: FlowState;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const activeIndex = FLOW_STATES.indexOf(state);

  return (
    <MotionConfig reducedMotion="user">
      <div className={`flow-shell flow-shell--${state}`}>
        <div className="cloud-field" aria-hidden="true">
          <motion.div
            className="cloud cloud--one"
            animate={
              reduceMotion
                ? undefined
                : { x: [0, 34, 0], y: [0, -18, 0], scale: [1, 1.05, 1] }
            }
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="cloud cloud--two"
            animate={
              reduceMotion
                ? undefined
                : { x: [0, -28, 0], y: [0, 22, 0], scale: [1.04, 1, 1.04] }
            }
            transition={{ duration: 27, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="atmosphere-noise" />
        </div>

        <header className="flow-header">
          <div className="brand-lockup" aria-label="Shepard">
            <span className="brand-mark" aria-hidden="true">
              <Image
                src="/shepard-logo.png"
                alt=""
                width={580}
                height={580}
                priority
              />
            </span>
            <span className="brand-wordmark">Shepard</span>
          </div>

          <nav className="flow-progress" aria-label="Your Shepard journey">
            <ol>
              {FLOW_STATES.map((step, index) => {
                const status =
                  index < activeIndex
                    ? "complete"
                    : index === activeIndex
                      ? "active"
                      : "upcoming";
                return (
                  <li
                    key={step}
                    className={`flow-progress__step flow-progress__step--${status}`}
                    aria-current={status === "active" ? "step" : undefined}
                  >
                    <span className="flow-progress__rail" aria-hidden="true">
                      <motion.span
                        initial={false}
                        animate={{ scaleX: status === "upcoming" ? 0 : 1 }}
                        transition={{
                          type: "spring",
                          bounce: 0,
                          duration: 0.5,
                        }}
                      />
                    </span>
                    <span className="flow-progress__label">
                      {STEP_LABELS[step]}
                    </span>
                  </li>
                );
              })}
            </ol>
          </nav>
        </header>

        <div className="flow-stage">{children}</div>
      </div>
    </MotionConfig>
  );
}
