import type { RuntimeBlueprintTuple } from "#src/primitives-kit/lower-runtime-blueprints";
import type { RuntimePlan } from "#src/contracts";
import { all as kernelAll } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerRuntimeBlueprints } from "#src/primitives-kit/lower-runtime-blueprints";
import { unwrapEither } from "#src/primitives-kit/unwrap-either";

export function* all<Returns extends readonly unknown[]>(
  primitives: RuntimeBlueprintTuple<Returns>,
): RuntimePlan<Returns> {
  const either = yield* liftPlan(kernelAll(lowerRuntimeBlueprints(primitives)));
  return unwrapEither(either);
}
