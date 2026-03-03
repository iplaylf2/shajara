import type { RuntimePlan } from "#src/contracts";
import { suspend as kernelSuspend } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/lift-plan";

export function suspend(): RuntimePlan<never> {
  return liftPlan(kernelSuspend());
}
