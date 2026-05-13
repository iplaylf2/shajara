import type { RiteCoroutine, RiteRoutine } from "#/contracts";
import { decodeRitual, encodeRitual } from "#/boundary/index";
import { resumable as kernelResumable } from "@shajara/kernel";
import { wait } from "./wait";

/**
 * Runs a child routine whose scope-exit failure can be recovered by an ancestor `guard`.
 */
export function* resumable<Return>(ritual: RiteRoutine<Return>): RiteCoroutine<Return> {
  const [, future] = yield* encodeRitual(() => kernelResumable(decodeRitual(ritual)))();
  return yield* wait(future);
}
