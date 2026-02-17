import type { RuntimePlan } from "#src/contracts/plan";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const suspend = (): RuntimePlan<never> => notImplementedRuntimePrimitive("suspend");
