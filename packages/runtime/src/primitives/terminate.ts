import type { RuntimePlan } from "#src/contracts";
import type { SpawnRef } from "@khora/kernel";
import { terminate as kernelTerminate } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export const terminate = (spawned: SpawnRef): RuntimePlan<void> =>
  liftPlan(kernelTerminate(spawned));
