import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { resumable as kernelResumable } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";
import { unwrapEither } from "#src/primitives-kit/unwrap-either";

export function* resumable<Return>(blueprint: RuntimeBlueprint<Return>): RuntimePlan<Return> {
  const either = yield* liftPlan(kernelResumable(lowerPlan(blueprint())));
  return unwrapEither(either);
}
