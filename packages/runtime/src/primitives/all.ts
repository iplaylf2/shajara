import type { RuntimePlan, RuntimePrimitiveTuple } from "#src/contracts";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const all = <ReturnValues extends readonly unknown[]>(
  _primitives: RuntimePrimitiveTuple<ReturnValues>,
): RuntimePlan<ReturnValues> => notImplementedRuntimePrimitive("all");
