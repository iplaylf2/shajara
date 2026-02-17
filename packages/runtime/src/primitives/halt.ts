import type { RuntimePlan } from "#src/runtime-kit/runtime-protocol";
import { notImplementedRuntimePrimitive } from "#src/runtime-kit/not-implemented";

export const halt = (): RuntimePlan<never> => notImplementedRuntimePrimitive("halt");
