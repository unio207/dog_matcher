"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { useAgentHandlerLink } from "@mergeapi/react-agent-handler-link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RawMergeData, SignalKey } from "@/types";

type Status =
  | "idle"
  | "linking"
  | "connected"
  | "loading"
  | "complete"
  | "deleting"
  | "deleted"
  | "error";

const SIGNAL_LABELS: Record<SignalKey, string> = {
  meetingDensity: "Meeting density",
  timeOfDaySpread: "Active-hour spread",
  weekendLoad: "Weekend load",
  longestFreeBlock: "Longest free block",
  travelGaps: "Travel gaps",
  groupEventRatio: "Group event ratio",
  messageVolume: "Message volume",
  afterHoursActivity: "After-hours activity",
  fileActivity: "File activity",
};

async function safeResponseError(response: Response): Promise<string> {
  if (response.status === 401) return "Your session expired. Sign in again.";
  if (response.status === 409) return "Connect Calendar again to continue.";
  if (response.status === 429) return "Too many attempts. Wait a moment and retry.";
  if (response.status === 503) return "The live integration is not configured.";
  return "The live connection could not complete. No sample data was substituted.";
}

function MergeLinkLauncher({
  linkToken,
  onSuccess,
  onExit,
}: {
  linkToken: string;
  onSuccess: () => void;
  onExit: () => void;
}) {
  const opened = useRef(false);
  const stableSuccess = useCallback(onSuccess, [onSuccess]);
  const stableExit = useCallback(onExit, [onExit]);
  const { open, isReady, error } = useAgentHandlerLink({
    linkToken,
    enable_telemetry: false,
    onSuccess: stableSuccess,
    onExit: stableExit,
  });

  useEffect(() => {
    if (isReady && !opened.current) {
      opened.current = true;
      open();
    }
  }, [isReady, open]);

  useEffect(() => {
    if (error) stableExit();
  }, [error, stableExit]);

  return (
    <p className="merge-demo__status" role="status">
      {error ? "Merge Link could not load." : "Opening secure Calendar authorization…"}
    </p>
  );
}

export default function MergeDemoClient({
  configured,
  signedIn,
  displayName,
}: {
  configured: boolean;
  signedIn: boolean;
  displayName: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [connected, setConnected] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<RawMergeData | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleLinkSuccess = useCallback(() => {
    setLinkToken(null);
    setMessage(null);
    setConnected(true);
    setStatus("connected");
  }, []);

  const handleLinkExit = useCallback(() => {
    setLinkToken(null);
    setStatus(connected ? "connected" : "idle");
  }, [connected]);

  async function connectCalendar() {
    setMessage(null);
    setProfile(null);
    setStatus("linking");
    try {
      const response = await fetch("/api/merge-demo/link-token", {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(await safeResponseError(response));
      const payload = (await response.json()) as { linkToken?: unknown };
      if (typeof payload.linkToken !== "string" || !payload.linkToken) {
        throw new Error("Merge returned an invalid authorization session.");
      }
      setLinkToken(payload.linkToken);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Calendar authorization could not start."
      );
      setStatus("error");
    }
  }

  async function buildProfile() {
    setMessage(null);
    setStatus("loading");
    try {
      const response = await fetch("/api/merge-demo/profile", {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        if (response.status === 409) setConnected(false);
        throw new Error(await safeResponseError(response));
      }
      const payload = (await response.json()) as RawMergeData;
      if (!payload?.signals || !Array.isArray(payload.connectors)) {
        throw new Error("The server returned an invalid aggregate profile.");
      }
      setProfile(payload);
      setStatus("complete");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Profile generation failed."
      );
      setStatus("error");
    }
  }

  async function deleteMergeData() {
    if (
      !window.confirm(
        "Permanently disconnect Calendar and delete your Merge Registered User?"
      )
    ) {
      return;
    }

    setMessage(null);
    setStatus("deleting");
    try {
      const response = await fetch("/api/merge-demo/account", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        if (response.status === 409) setConnected(false);
        throw new Error(await safeResponseError(response));
      }
      setProfile(null);
      setLinkToken(null);
      setConnected(false);
      setStatus("deleted");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Data deletion failed."
      );
      setStatus("error");
    }
  }

  return (
    <main className="merge-demo">
      <div className="merge-demo__orb merge-demo__orb--one" />
      <div className="merge-demo__orb merge-demo__orb--two" />
      <header className="merge-demo__header">
        <Link className="brand-lockup" href="/" aria-label="Back to Shepard demo">
          <span className="brand-mark">
            <Image src="/shepard-logo.png" alt="" fill sizes="35px" />
          </span>
          <span className="brand-wordmark">Shepard</span>
        </Link>
        <span className="merge-demo__route-label">Separate integration lab</span>
      </header>

      <div className="merge-demo__content">
        <section className="merge-demo__intro" aria-labelledby="merge-demo-title">
          <p className="eyebrow">Live Calendar · private by design</p>
          <h1 id="merge-demo-title">Connect the shape of your week.</h1>
          <p className="merge-demo__lede">
            This isolated page turns 30 days of Calendar timing into aggregate
            lifestyle signals. Event titles, descriptions, locations, and attendee
            identities never leave the server.
          </p>
          <ul className="merge-demo__privacy-list">
            <li><span>01</span> One Merge identity per signed-in person</li>
            <li><span>02</span> Calendar access only—no write tools</li>
            <li><span>03</span> Raw events are reduced, never stored</li>
          </ul>
        </section>

        <section className="merge-demo__panel glass-panel" aria-live="polite">
          <div className="merge-demo__panel-head">
            <div>
              <p className="eyebrow">Connection status</p>
              <h2>Calendar signal lab</h2>
            </div>
            <span className={`merge-demo__dot merge-demo__dot--${configured ? "ready" : "off"}`}>
              {configured ? "Ready" : "Setup needed"}
            </span>
          </div>

          {!configured ? (
            <div className="merge-demo__state">
              <p className="merge-demo__state-title">Live credentials are not installed.</p>
              <p>
                The reliable fixture demo remains available. Configure Google OAuth
                and Merge Agent Handler server secrets to enable this page.
              </p>
              <Link className="primary-button" href="/">Open sample demo</Link>
            </div>
          ) : !signedIn ? (
            <div className="merge-demo__state">
              <p className="merge-demo__state-title">Start with an isolated identity.</p>
              <p>
                Google sign-in identifies your private Merge connection. Signing in
                does not grant Calendar access; that remains a separate consent step.
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={() => void signIn("google", { callbackUrl: "/merge-demo" })}
              >
                Sign in with Google
              </button>
            </div>
          ) : (
            <>
              <div className="merge-demo__identity">
                <span aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>
                <div>
                  <p>Signed in as</p>
                  <strong>{displayName}</strong>
                </div>
                <button
                  className="merge-demo__text-button"
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/merge-demo" })}
                >
                  Sign out
                </button>
              </div>

              <div className="merge-demo__connectors">
                <article className="merge-demo__connector merge-demo__connector--live">
                  <span className="merge-demo__connector-code">CAL</span>
                  <div>
                    <strong>Google Calendar</strong>
                    <p>Live · explicit authorization</p>
                  </div>
                  <span>{connected ? "Connected" : "Available"}</span>
                </article>
                <article className="merge-demo__connector">
                  <span className="merge-demo__connector-code">SLK</span>
                  <div><strong>Slack</strong><p>Sample aggregate only</p></div>
                  <span>Sample</span>
                </article>
                <article className="merge-demo__connector">
                  <span className="merge-demo__connector-code">DRV</span>
                  <div><strong>Google Drive</strong><p>Sample aggregate only</p></div>
                  <span>Sample</span>
                </article>
              </div>

              {linkToken ? (
                <MergeLinkLauncher
                  linkToken={linkToken}
                  onSuccess={handleLinkSuccess}
                  onExit={handleLinkExit}
                />
              ) : null}

              {message ? <p className="merge-demo__error" role="alert">{message}</p> : null}

              <div className="merge-demo__actions">
                {connected ? (
                  <button
                    className="primary-button"
                    type="button"
                    disabled={status === "loading"}
                    onClick={() => void buildProfile()}
                  >
                    {status === "loading" ? "Reducing metadata…" : "Build my live profile"}
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    type="button"
                    disabled={status === "linking" || status === "deleting"}
                    onClick={() => void connectCalendar()}
                  >
                    {status === "linking" ? "Preparing secure Link…" : "Connect Calendar"}
                  </button>
                )}
                <Link className="secondary-button" href="/">Use sample demo</Link>
              </div>

              {status === "deleted" ? (
                <p className="merge-demo__success" role="status">
                  Your Merge Registered User and Calendar credential were deleted.
                </p>
              ) : null}

              {profile ? (
                <div className="merge-demo__results">
                  <div className="merge-demo__results-head">
                    <div>
                      <p className="eyebrow">Aggregate output</p>
                      <h3>Your rhythm, not your content</h3>
                    </div>
                    <span>30-day window</span>
                  </div>
                  <div className="merge-demo__signal-grid">
                    {(Object.keys(SIGNAL_LABELS) as SignalKey[]).map((key) => {
                      const signal = profile.signals[key];
                      return (
                        <article key={key} className="merge-demo__signal">
                          <div>
                            <span>{SIGNAL_LABELS[key]}</span>
                            <strong>{Math.round(signal.value * 100)}%</strong>
                          </div>
                          <p>{signal.raw}</p>
                          <small>{signal.synthetic ? "Sample input" : "Live Calendar aggregate"}</small>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="merge-demo__danger">
                <div>
                  <strong>Connection control</strong>
                  <p>Deletion removes the Merge identity and linked Calendar credential.</p>
                </div>
                <button
                  type="button"
                  disabled={status === "deleting"}
                  onClick={() => void deleteMergeData()}
                >
                  {status === "deleting" ? "Deleting…" : "Disconnect & delete"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
