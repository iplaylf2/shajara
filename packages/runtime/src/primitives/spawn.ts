import type { RuntimeBlueprint } from "#src/bridge/blueprint";
import type { RuntimePlan } from "#src/contracts/plan";
import type { RuntimeSpawnRef } from "#src/contracts/entities";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const spawn = <ReturnValue>(
  _blueprint: RuntimeBlueprint<ReturnValue>,
): RuntimePlan<RuntimeSpawnRef<ReturnValue>> => notImplementedRuntimePrimitive("spawn");
