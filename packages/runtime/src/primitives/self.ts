import type { RuntimePlan, RuntimeSelfDescriptor } from "#src/contracts";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const self = (): RuntimePlan<RuntimeSelfDescriptor> =>
  notImplementedRuntimePrimitive("self");
