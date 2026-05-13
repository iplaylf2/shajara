import type { RiteCoroutine, RiteRoutine } from "#/contracts";
import { decodeRitual, encodeRitual } from "#/boundary/index";
import { branch as kernelBranch } from "@shajara/kernel";
import { waitChild } from "#/primitives-kit";

/**
 * Runs a routine in a child scope and waits for its result.
 *
 * @returns Child routine result.
 * @throws Shajara error when the child scope is canceled or fails.
 */
export function* branch<Return>(entry: RiteRoutine<Return>): RiteCoroutine<Return> {
  const child = yield* encodeRitual(() => kernelBranch(decodeRitual(entry)))();
  return yield* waitChild(child);
}
