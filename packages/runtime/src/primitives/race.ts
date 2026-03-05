import type { RuntimeBlueprintTuple, RuntimeBlueprintValue } from "#src/boundary";
import { liftBlueprint, lowerRuntimeBlueprints, unwrapEither } from "#src/boundary";
import type { RuntimePlan } from "#src/contracts";
import { race as kernelRace } from "@khora/kernel/primitives";

export function* race<Returns extends readonly unknown[]>(
  primitives: RuntimeBlueprintTuple<Returns>,
): RuntimePlan<RuntimeBlueprintValue<Returns>> {
  const either = yield* liftBlueprint(() =>
    kernelRace<Returns>(lowerRuntimeBlueprints(primitives)),
  );
  return unwrapEither(either);
}
