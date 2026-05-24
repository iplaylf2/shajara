import type { RiteCoroutine, RiteRoutine } from "#/contracts";
import { decodeRitual, encodeRitual } from "#/boundary/index";
import { resumable as kernelResumable } from "@shajara/kernel";
import { wait } from "./wait";

/**
 * Runs a child routine whose scope exit failure can be recovered by an ancestor `guard(...)`.
 *
 * @returns Child result or recovered value.
 * @throws Error supplied by recovery, or the original scope-exit error when no recovery handles it.
 */
export function* resumable<Return>(routine: RiteRoutine<Return>): RiteCoroutine<Return> {
  const [, future] = yield* encodeRitual(() => kernelResumable(decodeRitual(routine)))();
  return yield* wait(future);
}
