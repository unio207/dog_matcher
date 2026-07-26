import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  createMergeDemoClient,
  handleMergeDemoRoute,
  mergeDemoRateLimiter,
} from "@/lib/merge-demo/routes";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleMergeDemoRoute("link-token", request, {
    env: process.env,
    production: process.env.NODE_ENV === "production",
    limiter: mergeDemoRateLimiter,
    getProviderSub: async (req) => {
      const token = await getToken({
        req: req as NextRequest,
        secret: process.env.AUTH_SECRET,
      });
      return token?.googleProviderSub;
    },
    createClient: createMergeDemoClient,
  });
}
