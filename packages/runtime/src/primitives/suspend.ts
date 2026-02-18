import type { RuntimePlan } from "#src/contracts";
import { suspend as kernelSuspend } from "@khora/kernel";
import { liftPlan } from "#src/adapter/plan-lift";

export const suspend = (): RuntimePlan<never> => liftPlan(kernelSuspend());
