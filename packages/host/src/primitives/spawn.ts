import type { RiteCoroutine, RiteFuture, RiteRoutine } from "#/contracts";
import { decodeRitual, encodeRitual } from "#/boundary/index";
import { spawn as kernelSpawn } from "@shajara/kernel";

export function spawn<Return>(routine: RiteRoutine<Return>): RiteCoroutine<RiteFuture<Return>> {
  return encodeRitual(() => kernelSpawn(decodeRitual(routine)))();
}
