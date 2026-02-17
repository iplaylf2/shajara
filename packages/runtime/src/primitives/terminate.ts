import type { RuntimePlan } from "#src/contracts/plan";
import type { RuntimeSpawnRef } from "#src/contracts/entities";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const terminate = (_spawned: RuntimeSpawnRef): RuntimePlan<void> =>
  notImplementedRuntimePrimitive("terminate");
