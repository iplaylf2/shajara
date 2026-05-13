import type { RiteCoroutine, RiteFuture, RiteRoutine } from "#/contracts";
import { decodeRitual, encodeRitual } from "#/boundary/index";
import { spawn as kernelSpawn } from "@shajara/kernel";

/**
 * Starts a child process in the current scope without waiting for it.
 *
 * @returns Future for observing the child process result.
 */
export function spawn<Return>(routine: RiteRoutine<Return>): RiteCoroutine<RiteFuture<Return>> {
  return encodeRitual(() => kernelSpawn(decodeRitual(routine)))();
}
