import { NextResponse } from "next/server";
import { explainMatch } from "@/lib/gateway";
import type { HumanProfile, ShelterDog } from "@/types";

const FALLBACK =
  "This dog's needs line up closely with the rhythm of your week — the pace, the hours you're home, and how much quiet you keep.";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      profile: HumanProfile;
      dog: ShelterDog;
    };
    if (!body?.profile || !body?.dog) {
      return NextResponse.json({ explanation: FALLBACK });
    }
    const explanation = await explainMatch(body.profile, body.dog);
    return NextResponse.json({ explanation: explanation || FALLBACK });
  } catch (e) {
    console.error("[api/explain] falling back", e);
    return NextResponse.json({ explanation: FALLBACK });
  }
}
