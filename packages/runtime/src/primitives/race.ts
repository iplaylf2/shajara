import type { ArrayValues, UnknownArray } from "type-fest";
import { liftBlueprint, lowerRuntimeBlueprints, unwrapEither } from "#src/boundary";
import type { RuntimeBlueprintTuple } from "#src/boundary";
import type { RuntimePlan } from "#src/contracts";
import { race as kernelRace } from "@khora/kernel/primitives";

export function* race<Returns extends UnknownArray>(
  primitives: RuntimeBlueprintTuple<Returns>,
): RuntimePlan<ArrayValues<Returns>> {
  const either = yield* liftBlueprint(() =>
    kernelRace<Returns>(lowerRuntimeBlueprints(primitives)),
  );
  return unwrapEither(either);
}
