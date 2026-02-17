import type { RuntimePlan } from "#src/contracts/plan";
import type { RuntimeSelfDescriptor } from "#src/contracts/entities";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const self = (): RuntimePlan<RuntimeSelfDescriptor> =>
  notImplementedRuntimePrimitive("self");
