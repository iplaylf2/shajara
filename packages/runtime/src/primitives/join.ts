import type { RuntimePlan } from "#src/contracts";
import type { SpawnRef } from "@khora/kernel";
import { join as kernelJoin } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export const join = <ReturnValue>(spawned: SpawnRef<ReturnValue>): RuntimePlan<ReturnValue> =>
  liftPlan(kernelJoin(spawned));
