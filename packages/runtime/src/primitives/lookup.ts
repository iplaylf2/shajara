import type { RuntimePlan } from "#src/runtime-kit/runtime-protocol";
import { notImplementedRuntimePrimitive } from "#src/runtime-kit/not-implemented";

export const lookup = <Value>(_key: string): RuntimePlan<Value> =>
  notImplementedRuntimePrimitive("lookup");
