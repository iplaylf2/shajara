import type { RuntimePlan } from "#src/runtime-kit/runtime-protocol";
import type { RuntimeSelfDescriptor } from "#src/runtime-kit/runtime-entities";
import { notImplementedRuntimePrimitive } from "#src/runtime-kit/not-implemented";

function self(): RuntimePlan<RuntimeSelfDescriptor> {
  return notImplementedRuntimePrimitive("self");
}

export { self };
