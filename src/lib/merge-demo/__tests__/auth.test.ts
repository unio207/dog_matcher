import { describe, expect, it } from "vitest";
import { authOptions } from "@/auth";

describe("Google Auth.js identity binding", () => {
  it("copies only the Google provider subject into the encrypted JWT", async () => {
    const jwt = authOptions.callbacks?.jwt;
    if (!jwt) throw new Error("JWT callback is required");

    const token = await jwt({
      token: { sub: "authjs-sub" },
      account: {
        provider: "google",
        providerAccountId: "google-provider-subject",
        type: "oauth",
      },
      user: { id: "user" },
      trigger: "signIn",
    });

    expect(token.googleProviderSub).toBe("google-provider-subject");
    expect(JSON.stringify(token)).not.toContain("access_token");
  });

  it("does not treat a different provider account id as Google identity", async () => {
    const jwt = authOptions.callbacks?.jwt;
    if (!jwt) throw new Error("JWT callback is required");

    const token = await jwt({
      token: {},
      account: {
        provider: "github",
        providerAccountId: "other-provider-subject",
        type: "oauth",
      },
      user: { id: "user" },
      trigger: "signIn",
    });

    expect(token.googleProviderSub).toBeUndefined();
  });
});
