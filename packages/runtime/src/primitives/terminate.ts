import type { RuntimePlan } from "#src/runtime-kit/runtime-protocol";
import type { RuntimeSpawnRef } from "#src/runtime-kit/runtime-entities";
import { notImplementedRuntimePrimitive } from "#src/runtime-kit/not-implemented";

export const terminate = (_spawned: RuntimeSpawnRef): RuntimePlan<void> =>
  notImplementedRuntimePrimitive("terminate");
