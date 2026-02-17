import type { RuntimePlan, RuntimeSelfDescriptor } from "#src/contracts";
import { self as kernelSelf } from "@khora/kernel";
import { liftPlan } from "#src/plan-lift";

export const self = (): RuntimePlan<RuntimeSelfDescriptor> => liftPlan(kernelSelf<RuntimeSelfDescriptor>());
