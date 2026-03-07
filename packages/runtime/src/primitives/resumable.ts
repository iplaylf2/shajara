import type { RiteRoutine, RiteCoroutine } from "#src/contracts";
import { decodeRitual, encodeRitual, unwrapEither } from "#src/boundary";
import { resumable as kernelResumable } from "@shajara/kernel";

export function* resumable<Return>(blueprint: RiteRoutine<Return>): RiteCoroutine<Return> {
  const outcome = yield* encodeRitual(() => kernelResumable(decodeRitual(blueprint)))();
  return unwrapEither(outcome);
}
