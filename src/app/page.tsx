"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import AnalyzingScreen from "@/components/screens/AnalyzingScreen";
import ConnectScreen from "@/components/screens/ConnectScreen";
import GeneratingScreen from "@/components/screens/GeneratingScreen";
import ProfileScreen from "@/components/screens/ProfileScreen";
import NearbyScreen from "@/components/screens/NearbyScreen";
import YourDogScreen from "@/components/screens/YourDogScreen";
import FlowShell from "@/components/FlowShell";
import { personas } from "@/data/fixtures/personas";
import { computeAll, isFlowState, type FlowData } from "@/lib/flow";
import type { FlowState, RawMergeData } from "@/types";

export default function Home() {
  const [state, setState] = useState<FlowState>("connect");
  const [data, setData] = useState<FlowData | null>(null);
  // Bumped on every entry into a theater screen so it replays.
  const [runId, setRunId] = useState(0);

  // Dev-harness deep link: /?state=profile&persona=homebody
  // Everything is computed synchronously from the fixture, then we jump.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("state");
    if (!isFlowState(target)) return;
    const personaId = params.get("persona") ?? "homebody";
    const raw = personas[personaId] ?? personas.homebody;
    setData(computeAll(raw));
    setRunId((n) => n + 1);
    setState(target);
  }, []);

  /** THE CRITICAL RULE: analyze + genome + match all happen right here,
   *  synchronously, before we ever enter `analyzing`. */
  function handleConnected(raw: RawMergeData) {
    setData(computeAll(raw));
    setRunId((n) => n + 1);
    setState("analyzing");
  }

  function go(next: FlowState) {
    setRunId((n) => n + 1);
    setState(next);
  }

  function restart() {
    setData(null);
    setState("connect");
  }

  let screen = null;

  if (state === "connect") {
    screen = <ConnectScreen onConnected={handleConnected} />;
  } else if (state === "analyzing" && data) {
    screen = (
      <AnalyzingScreen
        raw={data.raw}
        profile={data.profile}
        runId={runId}
        onDone={() => go("profile")}
      />
    );
  } else if (state === "profile" && data) {
    screen = (
      <ProfileScreen profile={data.profile} onNext={() => go("generating")} />
    );
  } else if (state === "generating" && data) {
    screen = (
      <GeneratingScreen
        genome={data.genome}
        runId={runId}
        onDone={() => go("dog")}
      />
    );
  } else if (state === "dog" && data) {
    screen = (
      <YourDogScreen
        genome={data.genome}
        profile={data.profile}
        onNext={() => go("nearby")}
      />
    );
  } else if (state === "nearby" && data) {
    screen = (
      <NearbyScreen
        profile={data.profile}
        matches={data.matches}
        onRestart={restart}
      />
    );
  }

  return (
    <FlowShell state={state}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={state}
          className="screen-frame"
          initial={{ opacity: 0, filter: "blur(12px)", y: 14 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          exit={{ opacity: 0, filter: "blur(8px)", y: -8 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {screen}
        </motion.section>
      </AnimatePresence>
    </FlowShell>
  );
}
