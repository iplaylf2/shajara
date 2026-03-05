import { liftBlueprint, lowerRuntimeBlueprints, unwrapEither } from "#src/boundary";
import type { RuntimeBlueprintTuple } from "#src/boundary";
import type { RuntimePlan } from "#src/contracts";
import { all as kernelAll } from "@khora/kernel/primitives";

export function* all<Returns extends readonly unknown[]>(
  primitives: RuntimeBlueprintTuple<Returns>,
): RuntimePlan<Returns> {
  const either = yield* liftBlueprint(() => kernelAll(lowerRuntimeBlueprints(primitives)));
  return unwrapEither(either);
}
