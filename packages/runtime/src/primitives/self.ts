import type { RuntimePlan } from "#src/contracts";
import type { SelfDescriptor } from "@khora/kernel";
import { self as kernelSelf } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export function self<
  Descriptor extends SelfDescriptor = SelfDescriptor,
>(): RuntimePlan<Descriptor> {
  return liftPlan(kernelSelf<Descriptor>());
}
