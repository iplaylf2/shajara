import type { RuntimePlan, RuntimeSpawnRef } from "#src/contracts";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const join = <ReturnValue>(
  _spawned: RuntimeSpawnRef<ReturnValue>,
): RuntimePlan<ReturnValue> => notImplementedRuntimePrimitive("join");
