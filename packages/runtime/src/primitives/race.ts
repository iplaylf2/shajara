import type { RuntimePlan, RuntimePlanFactoryTuple } from "#src/contracts";
import type { ArrayValues } from "type-fest";
import type { Plan } from "@khora/kernel";
import type { RaceResult } from "@khora/kernel/primitives";
import { race as kernelRace } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";

export type RuntimeRaceResult<ReturnValue> = RaceResult<ReturnValue>;

function raceKernelPrimitive<ReturnValues extends readonly unknown[]>(
  runtimePrimitives: RuntimePlanFactoryTuple<ReturnValues>,
): Plan<RuntimeRaceResult<ArrayValues<ReturnValues>>> {
  const kernelPrimitives = runtimePrimitives.map((runtimePrimitive) =>
    lowerPlan(runtimePrimitive()),
  ) as {
    readonly [Index in keyof ReturnValues]: Plan<ReturnValues[Index]>;
  };

  return kernelRace<ReturnValues>(kernelPrimitives);
}

export const race = <ReturnValues extends readonly unknown[]>(
  primitives: RuntimePlanFactoryTuple<ReturnValues>,
): RuntimePlan<RuntimeRaceResult<ArrayValues<ReturnValues>>> =>
  liftPlan(raceKernelPrimitive(primitives));
