import { describe, expect, it } from "vitest";
import {
  ANALYZING_MS,
  CONNECT_MS,
  FLOW_STATES,
  GENERATING_MS,
} from "@/lib/flow";

describe("demo flow", () => {
  it("keeps the six-state demo and cinematic theater timings", () => {
    expect(FLOW_STATES).toEqual([
      "connect",
      "analyzing",
      "profile",
      "generating",
      "dog",
      "nearby",
    ]);
    expect(CONNECT_MS).toBe(1800);
    expect(ANALYZING_MS).toBe(12000);
    expect(GENERATING_MS).toBe(14000);
  });
});
