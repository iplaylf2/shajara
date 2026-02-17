import type { RuntimePlan, RuntimeSpawnRef } from "#src/contracts";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const terminate = (_spawned: RuntimeSpawnRef): RuntimePlan<void> =>
  notImplementedRuntimePrimitive("terminate");
