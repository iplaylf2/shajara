import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { resumable as kernelResumable } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/lift-plan";
import { lowerPlan } from "#src/adapter/lower-plan";
import { unwrapEither } from "#src/primitives-kit";

export function* resumable<Return>(blueprint: RuntimeBlueprint<Return>): RuntimePlan<Return> {
  const either = yield* liftPlan(kernelResumable(() => lowerPlan(blueprint())));
  return unwrapEither(either);
}
