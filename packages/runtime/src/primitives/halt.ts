import type { RuntimePlan } from "#src/contracts";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const halt = (): RuntimePlan<never> => notImplementedRuntimePrimitive("halt");
