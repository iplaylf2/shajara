import type { RuntimeBlueprintTuple, RuntimeBlueprintValue } from "#src/primitives-kit";
import { lowerRuntimeBlueprints, unwrapEither } from "#src/primitives-kit";
import type { RuntimePlan } from "#src/contracts";
import { race as kernelRace } from "@khora/kernel/primitives";
import { liftBlueprint } from "#src/adapter/lift-blueprint";

export function* race<Returns extends readonly unknown[]>(
  primitives: RuntimeBlueprintTuple<Returns>,
): RuntimePlan<RuntimeBlueprintValue<Returns>> {
  const either = yield* liftBlueprint(() =>
    kernelRace<Returns>(lowerRuntimeBlueprints(primitives)),
  );
  return unwrapEither(either);
}
