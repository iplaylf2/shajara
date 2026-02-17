import type { RuntimeBlueprint } from "#src/blueprint";
import type { RuntimePlan } from "#src/runtime-kit/runtime-protocol";
import type { RuntimeSpawnRef } from "#src/runtime-kit/runtime-entities";
import { notImplementedRuntimePrimitive } from "#src/runtime-kit/not-implemented";

export const spawn = <ReturnValue>(
  _blueprint: RuntimeBlueprint<ReturnValue>,
): RuntimePlan<RuntimeSpawnRef<ReturnValue>> => notImplementedRuntimePrimitive("spawn");
