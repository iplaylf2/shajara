import type { RiteCoroutine, RiteFuture, RiteRoutine } from "#src/contracts";
import { decodeRitual, encodeRitual } from "#src/boundary";
import { spawn as kernelSpawn } from "@shajara/kernel";

export function spawn<Return>(worker: RiteRoutine<Return>): RiteCoroutine<RiteFuture<Return>> {
  return encodeRitual(() => kernelSpawn(decodeRitual(worker)))();
}
