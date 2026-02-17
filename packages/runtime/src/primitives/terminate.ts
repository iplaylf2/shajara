import type { RuntimePlan, RuntimeSpawnRef } from "#src/contracts";
import type { Plan } from "@khora/kernel";
import { terminate as kernelTerminate } from "@khora/kernel";
import { liftPlan } from "#src/plan-lift";

const terminateKernelPrimitive = (spawned: RuntimeSpawnRef): Plan<void> =>
  kernelTerminate<RuntimeSpawnRef>(spawned);

export const terminate = (spawned: RuntimeSpawnRef): RuntimePlan<void> =>
  liftPlan(terminateKernelPrimitive(spawned));
