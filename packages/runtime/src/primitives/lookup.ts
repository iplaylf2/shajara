import type { RuntimePlan } from "#src/contracts";
import { lookup as kernelLookup } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export function lookup<Value>(key: string): RuntimePlan<Value> {
  return liftPlan(kernelLookup<Value>(key));
}
