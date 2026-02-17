import type { RuntimePlan } from "#src/contracts/plan";
import type { RuntimeSpawnRef } from "#src/contracts/entities";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const join = <ReturnValue>(
  _spawned: RuntimeSpawnRef<ReturnValue>,
): RuntimePlan<ReturnValue> => notImplementedRuntimePrimitive("join");
