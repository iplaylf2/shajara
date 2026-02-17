import type { RuntimeBlueprint, RuntimePlan, RuntimeSpawnRef } from "#src/contracts";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const spawn = <ReturnValue>(
  _blueprint: RuntimeBlueprint<ReturnValue>,
): RuntimePlan<RuntimeSpawnRef<ReturnValue>> => notImplementedRuntimePrimitive("spawn");
