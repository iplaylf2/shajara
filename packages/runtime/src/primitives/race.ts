import type { RuntimePlan, RuntimePrimitiveTuple } from "#src/contracts";
import type { Plan } from "@khora/kernel";
import type { RaceResult } from "@khora/kernel/primitives";
import { race as kernelRace } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPrimitiveTuple } from "#src/adapter/plan-lower";

export type RuntimeRaceResult<ReturnValue> = RaceResult<ReturnValue>;

function raceKernelPrimitive<ReturnValues extends readonly unknown[]>(
  runtimePrimitives: RuntimePrimitiveTuple<ReturnValues>,
): Plan<RuntimeRaceResult<ReturnValues[number]>> {
  const kernelPrimitives = lowerPrimitiveTuple(runtimePrimitives);

  return kernelRace<ReturnValues>(kernelPrimitives);
}

export const race = <ReturnValues extends readonly unknown[]>(
  primitives: RuntimePrimitiveTuple<ReturnValues>,
): RuntimePlan<RuntimeRaceResult<ReturnValues[number]>> =>
  liftPlan(raceKernelPrimitive(primitives));
