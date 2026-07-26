"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { DogGenome } from "@/types";
import { describeGenome } from "@/lib/genome";

const DogViewer = dynamic(() => import("@/components/DogViewer"), {
  ssr: false,
});

const NUMERIC_KEYS = [
  "bodyLength",
  "bodyHeight",
  "legLength",
  "headSize",
  "earDroop",
  "earSize",
  "snoutLength",
  "tailLength",
  "tailCurl",
  "fluffiness",
  "posture",
] as const;

const BASE: DogGenome = {
  bodyLength: 0.5,
  bodyHeight: 0.5,
  legLength: 0.5,
  headSize: 0.5,
  earDroop: 0.5,
  earSize: 0.5,
  snoutLength: 0.5,
  tailLength: 0.5,
  tailCurl: 0.3,
  coatColor: "#c8965a",
  accentColor: "#f3e3c8",
  fluffiness: 0.4,
  posture: 0.5,
};

const PRESETS: { name: string; genome: DogGenome }[] = [
  {
    name: "dachshund-ish (long & low)",
    genome: {
      ...BASE,
      bodyLength: 1,
      bodyHeight: 0.35,
      legLength: 0.05,
      headSize: 0.3,
      earDroop: 0.95,
      earSize: 0.7,
      snoutLength: 0.9,
      tailLength: 0.5,
      tailCurl: 0.05,
      fluffiness: 0.05,
      posture: 0.15,
      coatColor: "#2f2b2a",
      accentColor: "#a8763c",
    },
  },
  {
    name: "leggy & alert",
    genome: {
      ...BASE,
      bodyLength: 0.2,
      bodyHeight: 0.2,
      legLength: 1,
      headSize: 0.35,
      earDroop: 0.02,
      earSize: 0.85,
      snoutLength: 0.85,
      tailLength: 0.85,
      tailCurl: 0.15,
      fluffiness: 0.05,
      posture: 1,
      coatColor: "#4a4a52",
      accentColor: "#cfcfd6",
    },
  },
  {
    name: "round & fluffy",
    genome: {
      ...BASE,
      bodyLength: 0.35,
      bodyHeight: 1,
      legLength: 0.15,
      headSize: 1,
      earDroop: 0.35,
      earSize: 0.4,
      snoutLength: 0.05,
      tailLength: 0.75,
      tailCurl: 1,
      fluffiness: 1,
      posture: 0.55,
      coatColor: "#e6d3ae",
      accentColor: "#fbf3e2",
    },
  },
  {
    name: "big-headed lounger",
    genome: {
      ...BASE,
      bodyLength: 0.8,
      bodyHeight: 0.8,
      legLength: 0.3,
      headSize: 0.95,
      earDroop: 1,
      earSize: 1,
      snoutLength: 0.2,
      tailLength: 0.2,
      tailCurl: 0.45,
      fluffiness: 0.6,
      posture: 0.05,
      coatColor: "#a4562c",
      accentColor: "#e8c9a0",
    },
  },
];

export default function GenomeDevPage() {
  const [genome, setGenome] = useState<DogGenome>(BASE);
  const [animate, setAnimate] = useState(false);

  const set = (k: keyof DogGenome, v: number | string) =>
    setGenome((g) => ({ ...g, [k]: v }));

  const replay = () => {
    setAnimate(false);
    // next tick so the false->true edge is observed by DogViewer
    setTimeout(() => setAnimate(true), 30);
  };

  return (
    <div style={{ display: "flex", gap: 16, padding: 16, fontFamily: "monospace" }}>
      <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 style={{ fontSize: 16 }}>genome dev</h1>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {PRESETS.map((p) => (
            <button key={p.name} onClick={() => setGenome(p.genome)}>
              {p.name}
            </button>
          ))}
        </div>

        <button onClick={replay}>replay assembly animation</button>
        <label>
          <input
            type="checkbox"
            checked={animate}
            onChange={(e) => setAnimate(e.target.checked)}
          />
          animate
        </label>

        {NUMERIC_KEYS.map((k) => (
          <label key={k} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ width: 110, fontSize: 11 }}>{k}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={genome[k]}
              onChange={(e) => set(k, Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ width: 34, fontSize: 11 }}>{genome[k].toFixed(2)}</span>
          </label>
        ))}

        <label style={{ display: "flex", gap: 8 }}>
          <span style={{ width: 110, fontSize: 11 }}>coatColor</span>
          <input
            type="color"
            value={genome.coatColor}
            onChange={(e) => set("coatColor", e.target.value)}
          />
        </label>
        <label style={{ display: "flex", gap: 8 }}>
          <span style={{ width: 110, fontSize: 11 }}>accentColor</span>
          <input
            type="color"
            value={genome.accentColor}
            onChange={(e) => set("accentColor", e.target.value)}
          />
        </label>

        <p style={{ fontSize: 11 }}>{describeGenome(genome).join(" · ")}</p>
        <pre style={{ fontSize: 10, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(genome, null, 1)}
        </pre>
      </div>

      <div style={{ flex: 1, height: "85vh", border: "1px solid #ccc" }}>
        <DogViewer genome={genome} animate={animate} />
      </div>
    </div>
  );
}
