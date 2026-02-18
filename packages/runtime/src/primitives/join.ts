import type { RuntimePlan, RuntimeSpawnRef } from "#src/contracts";
import { join as kernelJoin } from "@khora/kernel";
import { liftPlan } from "#src/adapter/plan-lift";

export const join = <ReturnValue>(
  spawned: RuntimeSpawnRef<ReturnValue>,
): RuntimePlan<ReturnValue> => liftPlan(kernelJoin(spawned));
