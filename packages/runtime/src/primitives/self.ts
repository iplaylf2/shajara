import type { RuntimePlan } from "#src/runtime-kit/runtime-protocol";
import type { RuntimeSelfDescriptor } from "#src/runtime-kit/runtime-entities";
import { notImplementedRuntimePrimitive } from "#src/runtime-kit/not-implemented";

export const self = (): RuntimePlan<RuntimeSelfDescriptor> =>
  notImplementedRuntimePrimitive("self");
