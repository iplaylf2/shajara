import type { RuntimePlan } from "#src/contracts";
import { suspend as kernelSuspend } from "@khora/kernel";
import { liftBlueprint } from "#src/boundary";

export function suspend(): RuntimePlan<never> {
  return liftBlueprint(() => kernelSuspend());
}
