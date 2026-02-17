import type { RuntimePlan, RuntimePrimitiveTuple } from "#src/contracts";
import { BLUEPRINT_BRIDGE } from "#src/blueprint-bridge";
import type { Plan } from "@khora/kernel";
import { all as kernelAll } from "@khora/kernel";
import { liftPlan } from "#src/plan-lift";

function allKernelPrimitive<ReturnValues extends readonly unknown[]>(
  runtimePrimitives: RuntimePrimitiveTuple<ReturnValues>,
): Plan<ReturnValues> {
  const kernelPrimitives = runtimePrimitives.map((runtimePrimitive) =>
    BLUEPRINT_BRIDGE.raise(runtimePrimitive)(),
  ) as { readonly [Index in keyof ReturnValues]: Plan<ReturnValues[Index]> };

  return kernelAll(kernelPrimitives);
}

export const all = <ReturnValues extends readonly unknown[]>(
  primitives: RuntimePrimitiveTuple<ReturnValues>,
): RuntimePlan<ReturnValues> => liftPlan(allKernelPrimitive(primitives));
