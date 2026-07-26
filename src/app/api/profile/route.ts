import { getRawMergeData } from "@/lib/merge";

export const dynamic = "force-dynamic";

export async function POST() {
  // getRawMergeData never throws: the live path falls back to fixtures.
  const data = await getRawMergeData();
  return Response.json(data);
}
