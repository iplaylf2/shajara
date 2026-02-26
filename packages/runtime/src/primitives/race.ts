import type {
  RuntimeBlueprintTuple,
  RuntimeBlueprintValue,
} from "#src/primitives-kit/lower-runtime-blueprints";
import type { RaceResult } from "@khora/kernel/primitives";
import type { RuntimePlan } from "#src/contracts";
import { race as kernelRace } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerRuntimeBlueprints } from "#src/primitives-kit/lower-runtime-blueprints";
import { unwrapEither } from "#src/primitives-kit/unwrap-either";

export function* race<Returns extends readonly unknown[]>(
  primitives: RuntimeBlueprintTuple<Returns>,
): RuntimePlan<RaceResult<RuntimeBlueprintValue<Returns>>> {
  const either = yield* liftPlan(kernelRace<Returns>(lowerRuntimeBlueprints(primitives)));
  return unwrapEither(either);
}
