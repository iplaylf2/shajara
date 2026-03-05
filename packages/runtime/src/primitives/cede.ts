import type { RuntimePlan } from "#src/contracts";
import { cede as kernelCede } from "@khora/kernel/primitives";
import { liftBlueprint } from "#src/adapter/lift-blueprint";

export function cede(): RuntimePlan<void> {
  return liftBlueprint(() => kernelCede());
}
