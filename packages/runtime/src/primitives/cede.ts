import type { RuntimePlan } from "#src/contracts";
import { cede as kernelCede } from "@khora/kernel/primitives";
import { liftBlueprint } from "#src/boundary";

export function cede(): RuntimePlan<void> {
  return liftBlueprint(() => kernelCede());
}
