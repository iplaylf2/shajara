import type { RuntimePlan } from "#src/contracts";
import { cede as kernelCede } from "@khora/kernel";
import { liftPlan } from "#src/plan-lift";

export const cede = (): RuntimePlan<void> => liftPlan(kernelCede());
