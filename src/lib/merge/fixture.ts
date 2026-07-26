import type { RawMergeData } from "@/types";
import { personas } from "@/data/fixtures/personas";
import type { MergeSource } from "./types";

export const DEFAULT_PERSONA = "homebody";

/** Resolve a persona id to a fixture, falling back to the default. */
export function getPersona(personaId?: string): RawMergeData {
  const id = personaId || process.env.FIXTURE_PERSONA || DEFAULT_PERSONA;
  return personas[id] ?? personas[DEFAULT_PERSONA];
}

export class FixtureMergeSource implements MergeSource {
  readonly kind = "fixture";

  constructor(private readonly personaId?: string) {}

  async getRawMergeData(): Promise<RawMergeData> {
    return getPersona(this.personaId);
  }
}
