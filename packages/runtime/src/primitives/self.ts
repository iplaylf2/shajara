import type { RuntimePlan, RuntimeSelfDescriptor } from "#src/contracts";
import { self as kernelSelf } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export const self = (): RuntimePlan<RuntimeSelfDescriptor> =>
  liftPlan(kernelSelf<RuntimeSelfDescriptor>());
