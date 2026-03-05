import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { resumable as kernelResumable } from "@khora/kernel/primitives";
import { liftBlueprint } from "#src/adapter/lift-blueprint";
import { lowerBlueprint } from "#src/adapter/lower-blueprint";
import { unwrapEither } from "#src/primitives-kit";

export function* resumable<Return>(blueprint: RuntimeBlueprint<Return>): RuntimePlan<Return> {
  const either = yield* liftBlueprint(() => kernelResumable(lowerBlueprint(blueprint)));
  return unwrapEither(either);
}
