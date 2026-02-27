import type { RuntimePlan } from "#src/contracts";
import { cede as kernelCede } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export function cede(): RuntimePlan<void> {
  return liftPlan(kernelCede());
}
