import { describe, expect, it } from "vitest";
import { buildMergeDemoCsp } from "../csp";

describe("Merge demo CSP", () => {
  it("allows the exact Merge loader iframe while nonce-locking scripts", () => {
    const csp = buildMergeDemoCsp("nonce-value", false);
    const scriptDirective = csp
      .split(";")
      .find((directive) => directive.trim().startsWith("script-src"));
    const frameDirective = csp
      .split(";")
      .find((directive) => directive.trim().startsWith("frame-src"));

    expect(scriptDirective).toContain("'nonce-nonce-value'");
    expect(scriptDirective).not.toContain("'unsafe-inline'");
    expect(frameDirective).toContain("https://ah-cdn.merge.dev");
  });
});
