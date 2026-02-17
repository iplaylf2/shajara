import type { RuntimePlan } from "#src/contracts";
import { halt as kernelHalt } from "@khora/kernel";
import { liftPlan } from "#src/plan-lift";

export const halt = (): RuntimePlan<never> => liftPlan(kernelHalt());
