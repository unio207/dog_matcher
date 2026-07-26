"use client";

import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import { useRef, useState } from "react";
import { personas } from "@/data/fixtures/personas";
import {
  CONNECTOR_CATALOG,
  REQUIRED_CONNECTOR_IDS,
  addConnector,
  connectorById,
  isConnectorSetupReady,
  removeConnector,
} from "@/lib/connectors";
import { CONNECT_MS } from "@/lib/flow";
import type { RawMergeData } from "@/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ConnectScreen({
  onConnected,
}: {
  onConnected: (raw: RawMergeData) => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [selectedConnectors, setSelectedConnectors] = useState<string[]>([]);
  const [connectedCount, setConnectedCount] = useState(0);
  const [draggingConnector, setDraggingConnector] = useState<string | null>(
    null
  );
  const [dragOverDock, setDragOverDock] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const setupReady = isConnectorSetupReady(selectedConnectors);

  async function connect() {
    if (connecting || !setupReady) return;
    setConnecting(true);
    setConnectedCount(0);

    // Kick off the real fetch and the (identical-looking) connect theater
    // at the same time. Whichever finishes last gates the transition.
    const fetching = fetch("/api/profile", { method: "POST" })
      .then((r) => {
        if (!r.ok) throw new Error(`/api/profile ${r.status}`);
        return r.json();
      })
      .then((json: RawMergeData) => {
        if (!json?.signals || !json?.connectors) {
          throw new Error("/api/profile returned malformed RawMergeData");
        }
        return json;
      })
      .catch((err): RawMergeData => {
        console.error("[Shepard] connect failed, using homebody fixture:", err);
        return personas.homebody;
      });

    const theater = (async () => {
      const step = CONNECT_MS / (REQUIRED_CONNECTOR_IDS.length + 1);
      for (let i = 0; i < REQUIRED_CONNECTOR_IDS.length; i++) {
        await sleep(step);
        setConnectedCount(i + 1);
      }
      await sleep(step);
    })();

    const [raw] = await Promise.all([fetching, theater]);
    // Compute happens in the parent, synchronously, before `analyzing`.
    onConnected(raw);
  }

  function selectConnector(connectorId: string) {
    if (connecting) return;
    setSelectedConnectors((current) => addConnector(current, connectorId));
  }

  function isPointInsideDock(info: PanInfo) {
    const dock = dockRef.current?.getBoundingClientRect();
    if (!dock) return false;
    // Motion reports page coordinates; DOMRect edges are viewport-relative.
    const x = info.point.x - window.scrollX;
    const y = info.point.y - window.scrollY;
    return (
      x >= dock.left && x <= dock.right && y >= dock.top && y <= dock.bottom
    );
  }

  function handleDragEnd(connectorId: string, info: PanInfo) {
    setDraggingConnector(null);
    setDragOverDock(false);
    if (isPointInsideDock(info)) {
      selectConnector(connectorId);
    }
  }

  const reduceMotion = useReducedMotion();
  const allConnected =
    connecting && connectedCount >= REQUIRED_CONNECTOR_IDS.length;
  const progressLabel = connecting
    ? allConnected
      ? "Signals connected"
      : `Connecting ${connectedCount + 1} of ${REQUIRED_CONNECTOR_IDS.length}`
    : setupReady
      ? "Ready to connect"
      : `${selectedConnectors.length} of ${REQUIRED_CONNECTOR_IDS.length} selected`;
  const buttonLabel = connecting
    ? allConnected
      ? "Connected"
      : "Connecting sources…"
    : setupReady
      ? "Connect my sources"
      : `Choose ${REQUIRED_CONNECTOR_IDS.length - selectedConnectors.length} more`;

  return (
    <div className="screen-frame">
      <div className="screen-content flex items-center">
        <form
          className="grid min-h-[calc(100dvh-8.25rem)] w-full items-center gap-10 xl:grid-cols-[minmax(0,1.1fr)_minmax(30rem,0.9fr)] xl:gap-14"
          onSubmit={(event) => {
            event.preventDefault();
            void connect();
          }}
        >
          <motion.div
            className="flex max-w-[46rem] flex-col items-start"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow mb-5" style={{ color: "var(--ink)" }}>
              Built around your real rhythm
            </p>
            <div className="relative isolate w-full">
              <h1 className="connect-hero-title relative m-0 text-[clamp(3.35rem,5.35vw,5.65rem)] leading-[0.91] font-[720] tracking-[-0.068em] text-white">
                <span className="block sm:whitespace-nowrap">
                  Your life already
                </span>
                <span className="block sm:whitespace-nowrap">
                  knows your dog.
                </span>
              </h1>
            </div>
            <p className="mt-7 max-w-[35rem] text-[clamp(1rem,1.35vw,1.18rem)] leading-relaxed font-[480] text-[rgb(16_35_63/0.78)]">
              Drag in the three sources Shepard can read. We use activity
              patterns, never private content.
            </p>

            <button
              type="submit"
              disabled={connecting || !setupReady}
              aria-describedby="connect-privacy"
              className="primary-button mt-8 min-w-[12.25rem] whitespace-nowrap"
              style={{ color: "var(--ink)" }}
            >
              {buttonLabel}
            </button>

            <p
              id="connect-privacy"
              className="mt-4 max-w-[31rem] text-xs leading-relaxed font-[560] text-[rgb(16_35_63/0.82)]"
            >
              Drag or tap Calendar, Drive, and Slack to continue.
            </p>
          </motion.div>

          <motion.div
            className="glass-panel relative isolate h-[min(70vh,35rem)] min-h-[31rem] w-full overflow-clip"
            initial={
              reduceMotion ? false : { opacity: 0, scale: 0.96, y: 18 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              type: "spring",
              bounce: 0,
              duration: 0.58,
              delay: 0.08,
            }}
            role="group"
            aria-label="Account connection setup"
            aria-busy={connecting && !allConnected}
          >
            <div
              className="tech-grid absolute inset-0 opacity-45"
              aria-hidden="true"
            />
            <div
              className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[rgb(255_255_255/0.34)] blur-3xl"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[rgb(88_145_226/0.22)] blur-3xl"
              aria-hidden="true"
            />
            <div className="relative z-10 flex h-full flex-col p-4 sm:p-5">
              <header className="flex items-center justify-between gap-4">
                <div>
                  <p className="m-0 text-[0.68rem] font-[740] tracking-[0.12em] text-[var(--ink)] uppercase">
                    Merge connection lab
                  </p>
                  <p className="mt-1 mb-0 text-[0.65rem] font-[560] text-[rgb(16_35_63/0.64)]">
                    Drag a source into the dock, or tap to add.
                  </p>
                </div>
                <span
                  className="rounded-full border border-[rgb(255_255_255/0.58)] bg-[rgb(255_255_255/0.34)] px-3 py-1.5 font-mono text-[0.61rem] font-[720] text-[var(--ink)]"
                  aria-live="polite"
                >
                  {progressLabel}
                </span>
              </header>

              <div
                ref={dockRef}
                className={[
                  "relative mt-3 min-h-[6.35rem] overflow-hidden rounded-[1.45rem] border p-2.5 transition-colors",
                  dragOverDock
                    ? "border-[rgb(255_87_87/0.86)] bg-[rgb(255_255_255/0.52)] shadow-[0_0_0_4px_rgb(255_87_87/0.08)]"
                    : draggingConnector
                      ? "border-[rgb(255_255_255/0.82)] bg-[rgb(255_255_255/0.3)]"
                    : setupReady
                      ? "border-[rgb(255_87_87/0.66)] bg-[rgb(255_255_255/0.46)]"
                      : "border-dashed border-[rgb(255_255_255/0.7)] bg-[rgb(255_255_255/0.2)]",
                ].join(" ")}
                aria-label="Selected connector dock"
              >
                <div
                  className="tech-grid pointer-events-none absolute inset-0 opacity-25"
                  aria-hidden="true"
                />
                <AnimatePresence mode="popLayout" initial={false}>
                  {selectedConnectors.length === 0 ? (
                    <motion.div
                      key="empty-dock"
                      className="relative flex min-h-[4.75rem] items-center justify-center gap-3 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-[0.9rem] bg-[var(--logo-coral)] p-1.5 shadow-[0_10px_26px_rgb(39_82_144/0.14)]">
                        <Image
                          src="/shepard-logo.png"
                          alt=""
                          width={580}
                          height={580}
                          className="block h-full w-full rounded-[0.65rem] object-cover"
                        />
                      </span>
                      <span>
                        <span className="block text-sm font-[700] tracking-[-0.025em] text-[var(--ink)]">
                          Drop your three life signals here
                        </span>
                        <span className="mt-1 block text-[0.62rem] font-[560] text-[rgb(16_35_63/0.62)]">
                          Calendar · Drive · Slack
                        </span>
                      </span>
                    </motion.div>
                  ) : (
                    <motion.ul
                      key="selected-dock"
                      className="relative m-0 grid min-h-[4.75rem] list-none grid-cols-3 gap-2 p-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {selectedConnectors.map((connectorId, index) => {
                        const connector = connectorById(connectorId);
                        if (!connector) return null;
                        const connected = connecting && index < connectedCount;
                        return (
                          <motion.li
                            key={connector.id}
                            layout
                            className="flex min-w-0 flex-col justify-between rounded-xl border border-[rgb(255_255_255/0.64)] bg-[rgb(255_255_255/0.42)] p-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.58)]"
                            initial={{ opacity: 0, y: 8, scale: 0.94 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.92 }}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-mono text-[0.57rem] font-[760] tracking-[0.08em] text-[var(--coral)]">
                                {connector.code}
                              </span>
                              {!connecting && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedConnectors((current) =>
                                      removeConnector(current, connector.id)
                                    )
                                  }
                                  className="grid h-5 w-5 place-items-center rounded-full text-xs leading-none text-[rgb(16_35_63/0.62)] transition-colors hover:bg-white/40 hover:text-[var(--ink)]"
                                  aria-label={`Remove ${connector.label}`}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                            <span className="truncate text-[0.67rem] font-[680] tracking-[-0.02em] text-[var(--ink)]">
                              {connector.label}
                            </span>
                            <span className="mt-1 text-[0.54rem] font-[650] text-[rgb(16_35_63/0.62)]">
                              {connected
                                ? "Connected"
                                : connecting
                                  ? "Authorizing…"
                                  : "Selected"}
                            </span>
                          </motion.li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-3 flex min-h-0 flex-1 flex-col">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="m-0 text-[0.63rem] font-[700] text-[var(--ink)]">
                    Connector shelf
                  </p>
                  <p className="m-0 text-[0.56rem] font-[610] text-[rgb(16_35_63/0.58)]">
                    3 available · 7 preview
                  </p>
                </div>

                <ul className="m-0 grid min-h-0 flex-1 list-none grid-cols-2 content-start gap-1.5 overflow-visible p-0">
                  {CONNECTOR_CATALOG.map((connector, index) => {
                    const selected = selectedConnectors.includes(connector.id);
                    return (
                      <li key={connector.id}>
                        <motion.button
                          type="button"
                          drag={
                            connector.enabled && !selected && !connecting
                          }
                          dragSnapToOrigin
                          dragMomentum={false}
                          onDragStart={() => {
                            setDraggingConnector(connector.id);
                            setDragOverDock(false);
                          }}
                          onDrag={(_, info) =>
                            setDragOverDock(isPointInsideDock(info))
                          }
                          onDragEnd={(_, info) =>
                            handleDragEnd(connector.id, info)
                          }
                          onClick={() => selectConnector(connector.id)}
                          disabled={!connector.enabled || connecting}
                          aria-pressed={selected}
                          aria-disabled={!connector.enabled || connecting}
                          title={
                            connector.enabled
                              ? `${selected ? "Selected" : "Add"} ${connector.label}`
                              : `${connector.label} is a preview in this demo`
                          }
                          className={[
                            "relative flex min-h-[3.05rem] w-full items-center gap-2.5 overflow-hidden rounded-xl border px-2.5 py-1.5 text-left shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] transition-colors",
                            selected
                              ? "border-[rgb(255_87_87/0.72)] bg-[rgb(255_255_255/0.56)]"
                              : connector.enabled
                                ? "cursor-grab touch-none border-[rgb(255_255_255/0.58)] bg-[rgb(255_255_255/0.3)] active:cursor-grabbing"
                                : "border-[rgb(255_255_255/0.3)] bg-[rgb(255_255_255/0.12)] opacity-55",
                          ].join(" ")}
                          initial={
                            reduceMotion
                              ? false
                              : { opacity: 0, y: 7, scale: 0.98 }
                          }
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            type: "spring",
                            bounce: 0,
                            duration: 0.35,
                            delay: reduceMotion ? 0 : index * 0.025,
                          }}
                          whileDrag={{
                            zIndex: 30,
                            scale: 1.045,
                            boxShadow: "0 20px 45px rgb(38 79 140 / 0.24)",
                          }}
                          whileTap={
                            reduceMotion || !connector.enabled
                              ? undefined
                              : { scale: 0.98 }
                          }
                        >
                          <span
                            className={[
                              "grid h-7 w-7 shrink-0 place-items-center rounded-lg border font-mono text-[0.49rem] font-[760] tracking-[0.07em]",
                              connector.enabled
                                ? "border-[rgb(255_255_255/0.66)] bg-[rgb(255_255_255/0.5)] text-[var(--coral)]"
                                : "border-[rgb(255_255_255/0.38)] bg-[rgb(255_255_255/0.2)] text-[rgb(16_35_63/0.5)]",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            {connector.code}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.66rem] font-[690] tracking-[-0.02em] text-[var(--ink)]">
                              {connector.label}
                            </span>
                            <span className="mt-0.5 block text-[0.54rem] font-[600] text-[rgb(16_35_63/0.56)]">
                              {selected
                                ? "In dock"
                                : connector.enabled
                                  ? connector.category
                                  : "Preview"}
                            </span>
                          </span>
                          {connector.enabled && !selected && (
                            <span
                              className="text-[0.75rem] text-[rgb(16_35_63/0.48)]"
                              aria-hidden="true"
                            >
                              ↗
                            </span>
                          )}
                        </motion.button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
