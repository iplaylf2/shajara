import type { RiteCoroutine, RiteRoutine } from "#src/contracts";
import { decodeRitual, encodeRitual, unwrapEither } from "#src/boundary";
import { resumable as kernelResumable } from "@shajara/kernel";

export function* resumable<Return>(ritual: RiteRoutine<Return>): RiteCoroutine<Return> {
  const outcome = yield* encodeRitual(() => kernelResumable(decodeRitual(ritual)))();
  return unwrapEither(outcome);
}
