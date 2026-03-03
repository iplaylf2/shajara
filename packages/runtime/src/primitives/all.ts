import { lowerRuntimeBlueprints, unwrapEither } from "#src/primitives-kit";
import type { RuntimeBlueprintTuple } from "#src/primitives-kit";
import type { RuntimePlan } from "#src/contracts";
import { all as kernelAll } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/lift-plan";

export function* all<Returns extends readonly unknown[]>(
  primitives: RuntimeBlueprintTuple<Returns>,
): RuntimePlan<Returns> {
  const either = yield* liftPlan(kernelAll(lowerRuntimeBlueprints(primitives)));
  return unwrapEither(either);
}
