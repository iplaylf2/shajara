import type { RuntimePlan, RuntimePrimitiveTuple } from "#src/contracts";
import type { Plan } from "@khora/kernel";
import { all as kernelAll } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPrimitiveTuple } from "#src/adapter/plan-lower";

function allKernelPrimitive<ReturnValues extends readonly unknown[]>(
  runtimePrimitives: RuntimePrimitiveTuple<ReturnValues>,
): Plan<ReturnValues> {
  const kernelPrimitives = lowerPrimitiveTuple(runtimePrimitives);

  return kernelAll(kernelPrimitives);
}

export const all = <ReturnValues extends readonly unknown[]>(
  primitives: RuntimePrimitiveTuple<ReturnValues>,
): RuntimePlan<ReturnValues> => liftPlan(allKernelPrimitive(primitives));
