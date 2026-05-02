import type { RiteCoroutine, RiteRoutine } from "#/contracts";
import { decodeRitual, encodeRitual } from "#/boundary/index";
import { resumable as kernelResumable } from "@shajara/kernel";
import { wait } from "./wait";

export function* resumable<Return>(ritual: RiteRoutine<Return>): RiteCoroutine<Return> {
  const [, future] = yield* encodeRitual(() => kernelResumable(decodeRitual(ritual)))();
  return yield* wait(future);
}
