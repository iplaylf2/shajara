import type { RuntimePlan } from "#src/runtime-kit/runtime-protocol";
import type { RuntimePrimitiveTuple } from "#src/primitives-kit/runtime-primitive-tuple";
import { notImplementedRuntimePrimitive } from "#src/runtime-kit/not-implemented";

export const all = <ReturnValues extends readonly unknown[]>(
  _primitives: RuntimePrimitiveTuple<ReturnValues>,
): RuntimePlan<ReturnValues> => notImplementedRuntimePrimitive("all");
