import type { RuntimePlan } from "#src/contracts/plan";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const lookup = <Value>(_key: string): RuntimePlan<Value> =>
  notImplementedRuntimePrimitive("lookup");
