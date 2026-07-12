import type { RiteCoroutine, RiteRoutine } from "#/contracts/index.js";
import { decodeRitual, encodeRitual } from "#/boundary/index.js";
import { branch as kernelBranch } from "@shajara/kernel";
import { waitChild } from "#/primitives-kit/index.js";

/**
 * Runs a routine in a child scope and waits for that scope to converge.
 *
 * @returns Child routine result.
 * @throws Error when the child scope is canceled or fails.
 */
export function* branch<Return>(routine: RiteRoutine<Return>): RiteCoroutine<Return> {
  const child = yield* encodeRitual(() => kernelBranch(decodeRitual(routine)))();
  return yield* waitChild(child);
}
