import type { RiteCoroutine, RiteRoutine, ScopeRef } from "#src/contracts";
import { decodeRitual, encodeRitual } from "#src/boundary";
import { spawn as kernelSpawn } from "@shajara/kernel";

export function* spawn<Return>(entry: RiteRoutine<Return>): RiteCoroutine<ScopeRef<Return>> {
  return yield* encodeRitual(() => kernelSpawn(decodeRitual(entry)))();
}
