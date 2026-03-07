import type { RiteRoutine, RiteCoroutine } from "#src/contracts";
import { liftBlueprint, lowerBlueprint, unwrapEither } from "#src/boundary";
import { resumable as kernelResumable } from "@shajara/kernel";

export function* resumable<Return>(blueprint: RiteRoutine<Return>): RiteCoroutine<Return> {
  const outcome = yield* liftBlueprint(() => kernelResumable(lowerBlueprint(blueprint)))();
  return unwrapEither(outcome);
}
