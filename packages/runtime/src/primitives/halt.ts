import type { RuntimePlan } from "#src/contracts";
import { halt as kernelHalt } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export function halt(): RuntimePlan<never> {
  return liftPlan(kernelHalt());
}
