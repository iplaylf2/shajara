import type { RuntimePlan, RuntimePlanFactoryTuple } from "#src/contracts";
import type { Plan } from "@khora/kernel";
import { all as kernelAll } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";

function allKernelPrimitive<ReturnValues extends readonly unknown[]>(
  runtimePrimitives: RuntimePlanFactoryTuple<ReturnValues>,
): Plan<ReturnValues> {
  const kernelPrimitives = runtimePrimitives.map((runtimePrimitive) =>
    lowerPlan(runtimePrimitive()),
  ) as {
    readonly [Index in keyof ReturnValues]: Plan<ReturnValues[Index]>;
  };

  return kernelAll(kernelPrimitives);
}

export const all = <ReturnValues extends readonly unknown[]>(
  primitives: RuntimePlanFactoryTuple<ReturnValues>,
): RuntimePlan<ReturnValues> => liftPlan(allKernelPrimitive(primitives));
