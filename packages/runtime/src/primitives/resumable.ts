import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { liftBlueprint, lowerBlueprint, unwrapEither } from "#src/boundary";
import { resumable as kernelResumable } from "@khora/kernel";

export function* resumable<Return>(blueprint: RuntimeBlueprint<Return>): RuntimePlan<Return> {
  const either = yield* liftBlueprint(() => kernelResumable(lowerBlueprint(blueprint)));
  return unwrapEither(either);
}
