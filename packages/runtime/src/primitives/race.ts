import type {
  RuntimeBlueprintTuple,
  RuntimeBlueprintValue,
} from "#src/primitives-kit/lower-runtime-blueprints";
import type { RaceResult } from "@khora/kernel/primitives";
import type { RuntimePlan } from "#src/contracts";
import { race as kernelRace } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerRuntimeBlueprints } from "#src/primitives-kit/lower-runtime-blueprints";

export const race = <ReturnValues extends readonly unknown[]>(
  primitives: RuntimeBlueprintTuple<ReturnValues>,
): RuntimePlan<RaceResult<RuntimeBlueprintValue<ReturnValues>>> =>
  liftPlan(kernelRace<ReturnValues>(lowerRuntimeBlueprints(primitives)));
