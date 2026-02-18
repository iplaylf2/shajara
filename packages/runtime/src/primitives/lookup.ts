import type { RuntimePlan } from "#src/contracts";
import { lookup as kernelLookup } from "@khora/kernel";
import { liftPlan } from "#src/adapter/plan-lift";

export const lookup = <Value>(key: string): RuntimePlan<Value> =>
  liftPlan(kernelLookup<Value>(key));
