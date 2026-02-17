import type { RuntimePlan, RuntimeSpawnRef } from "#src/contracts";
import type { Plan } from "@khora/kernel";
import { join as kernelJoin } from "@khora/kernel";
import { liftPlan } from "#src/plan-lift";

const joinKernelPrimitive = <ReturnValue>(
  spawned: RuntimeSpawnRef<ReturnValue>,
): Plan<ReturnValue> => kernelJoin<ReturnValue, RuntimeSpawnRef<ReturnValue>>(spawned);

export const join = <ReturnValue>(
  spawned: RuntimeSpawnRef<ReturnValue>,
): RuntimePlan<ReturnValue> => liftPlan(joinKernelPrimitive(spawned));
