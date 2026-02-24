import type { RuntimePlan } from "#src/contracts";
import type { SelfDescriptor } from "@khora/kernel";
import { self as kernelSelf } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export const self = <
  Descriptor extends SelfDescriptor = SelfDescriptor,
>(): RuntimePlan<Descriptor> => liftPlan(kernelSelf<Descriptor>());
