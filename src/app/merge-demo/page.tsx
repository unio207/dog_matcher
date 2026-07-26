import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import MergeDemoClient from "@/components/MergeDemoClient";
import { isMergeDemoConfigured } from "@/lib/merge-demo/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Calendar Lab · Shepard",
  description:
    "A separate, privacy-preserving Google Calendar connection demo powered by Merge Agent Handler.",
};

export default async function MergeDemoPage() {
  const configured = isMergeDemoConfigured();
  const session = configured ? await getServerSession(authOptions) : null;

  return (
    <MergeDemoClient
      configured={configured}
      signedIn={Boolean(session)}
      displayName={session?.user?.name ?? "Signed-in user"}
    />
  );
}
