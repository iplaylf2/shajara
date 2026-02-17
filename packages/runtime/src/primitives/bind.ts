import type { RuntimePlan } from "#src/contracts/plan";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const bind = <Key extends string, Value>(_key: Key, _value: Value): RuntimePlan<void> =>
  notImplementedRuntimePrimitive("bind");
