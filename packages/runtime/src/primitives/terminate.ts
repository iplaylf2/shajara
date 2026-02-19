import type { RuntimePlan, RuntimeSpawnRef } from "#src/contracts";
import { terminate as kernelTerminate } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export const terminate = (spawned: RuntimeSpawnRef): RuntimePlan<void> =>
  liftPlan(kernelTerminate(spawned));
