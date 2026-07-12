import type { RiteCoroutine, RiteFuture, RiteRoutine } from "#/contracts/index.js";
import { decodeRitual, encodeRitual } from "#/boundary/index.js";
import { spawn as kernelSpawn } from "@shajara/kernel";

/**
 * Starts a process in the current scope and returns without waiting.
 *
 * @returns Future for the child process result.
 */
export function spawn<Return>(routine: RiteRoutine<Return>): RiteCoroutine<RiteFuture<Return>> {
  return encodeRitual(() => kernelSpawn(decodeRitual(routine)))();
}
