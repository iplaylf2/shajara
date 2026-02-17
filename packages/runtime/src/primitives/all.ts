import type { RuntimePlan } from "#src/contracts/plan";
import type { RuntimePrimitiveTuple } from "#src/contracts/primitive-tuple";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const all = <ReturnValues extends readonly unknown[]>(
  _primitives: RuntimePrimitiveTuple<ReturnValues>,
): RuntimePlan<ReturnValues> => notImplementedRuntimePrimitive("all");
