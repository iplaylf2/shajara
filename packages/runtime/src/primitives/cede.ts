import type { RuntimePlan } from "#src/contracts";
import { cede as kernelCede } from "@shajara/kernel";
import { liftBlueprint } from "#src/boundary";

export function cede(): RuntimePlan<void> {
  return liftBlueprint(() => kernelCede())();
}
