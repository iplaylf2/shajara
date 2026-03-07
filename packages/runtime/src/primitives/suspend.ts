import type { RuntimePlan } from "#src/contracts";
import { suspend as kernelSuspend } from "@shajara/kernel";
import { liftBlueprint } from "#src/boundary";

export function suspend(): RuntimePlan<never> {
  return liftBlueprint(() => kernelSuspend())();
}
