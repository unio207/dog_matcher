"use client";

import { useMemo, useState } from "react";
import DogViewer from "@/components/DogViewer";
import { personaIds, personas } from "@/data/fixtures/personas";
import { FLOW_STATES, computeAll, pct } from "@/lib/flow";

export default function DevPage() {
  const [personaId, setPersonaId] = useState<string>(personaIds[0]);

  // Fully synchronous: no fetch, no effects.
  const raw = personas[personaId];
  const { profile, genome, matches } = useMemo(() => computeAll(raw), [raw]);

  return (
    <main className="flex min-h-screen flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-lg">dev harness</h1>
        <select
          value={personaId}
          onChange={(e) => setPersonaId(e.target.value)}
          className="border px-2 py-1"
        >
          {personaIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="opacity-60">jump flow to:</span>
          {FLOW_STATES.map((s) => (
            <a
              key={s}
              href={`/?state=${s}&persona=${personaId}`}
              className="border px-2 py-1 underline"
            >
              {s}
            </a>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* raw */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm">RawMergeData</h2>
          <pre className="overflow-auto border p-2 text-[10px] leading-tight max-h-96">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </section>

        {/* profile */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm">HumanProfile</h2>
          <p className="text-xs opacity-70">{profile.summary}</p>
          <ul className="flex flex-col gap-2 text-xs">
            {profile.traits.map((t) => (
              <li key={t.key} className="flex flex-col gap-1 border-b pb-2">
                <div className="flex justify-between">
                  <span>{t.label}</span>
                  <span className="font-mono opacity-60">
                    {t.value.toFixed(2)} ({pct(t.value)})
                  </span>
                </div>
                <div className="h-1.5 border">
                  <div
                    className="h-full bg-current"
                    style={{ width: pct(t.value) }}
                  />
                </div>
                <ul className="pl-3 opacity-70">
                  {t.evidence.map((e, i) => (
                    <li key={i}>— {e}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        {/* genome + viewer */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm">DogGenome</h2>
          <pre className="overflow-auto border p-2 text-[10px] leading-tight max-h-56">
            {JSON.stringify(genome, null, 2)}
          </pre>
          <div className="h-72 border">
            <DogViewer genome={genome} className="h-full w-full" />
          </div>
        </section>
      </div>

      {/* full ranking */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm">Match ranking ({matches.length} dogs)</h2>
        <ol className="flex flex-col gap-1 text-xs">
          {matches.map((m, i) => (
            <li key={m.dog.id} className="flex gap-3 border-b py-1">
              <span className="w-6 shrink-0 font-mono opacity-60">{i + 1}.</span>
              <span className="w-32 shrink-0">{m.dog.name}</span>
              <span className="w-10 shrink-0 font-mono">{m.score}</span>
              <span className="w-40 shrink-0 opacity-60">{m.dog.breed}</span>
              <span className="flex-1 opacity-70">{m.reasons.join(" · ")}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
