import type { RuntimePlan } from "#src/contracts";
import { suspend as kernelSuspend } from "@khora/kernel/primitives";
import { liftBlueprint } from "#src/adapter/lift-blueprint";

export function suspend(): RuntimePlan<never> {
  return liftBlueprint(() => kernelSuspend());
}
