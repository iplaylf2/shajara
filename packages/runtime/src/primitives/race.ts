import type { KernelRaceResult, Plan } from "@khora/kernel";
import type { RuntimePlan, RuntimePrimitiveTuple } from "#src/contracts";
import { BLUEPRINT_BRIDGE } from "#src/blueprint-bridge";
import { race as kernelRace } from "@khora/kernel";
import { liftPlan } from "#src/plan-lift";

export type RuntimeRaceResult<ReturnValue> = KernelRaceResult<ReturnValue>;

function raceKernelPrimitive<ReturnValues extends readonly unknown[]>(
  runtimePrimitives: RuntimePrimitiveTuple<ReturnValues>,
): Plan<RuntimeRaceResult<ReturnValues[number]>> {
  const kernelPrimitives = runtimePrimitives.map((runtimePrimitive) =>
    BLUEPRINT_BRIDGE.raise(runtimePrimitive)(),
  ) as { readonly [Index in keyof ReturnValues]: Plan<ReturnValues[Index]> };

  return kernelRace<ReturnValues>(kernelPrimitives);
}

export const race = <ReturnValues extends readonly unknown[]>(
  primitives: RuntimePrimitiveTuple<ReturnValues>,
): RuntimePlan<RuntimeRaceResult<ReturnValues[number]>> =>
  liftPlan(raceKernelPrimitive(primitives));
