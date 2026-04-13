import type { RiteCoroutine, RiteFuture, RiteRoutine } from "#/contracts";
import { decodeRitual, encodeRitual } from "#/boundary";
import { spawn as kernelSpawn } from "@shajara/kernel";

export function spawn<Return>(worker: RiteRoutine<Return>): RiteCoroutine<RiteFuture<Return>> {
  return encodeRitual(() => kernelSpawn(decodeRitual(worker)))();
}
