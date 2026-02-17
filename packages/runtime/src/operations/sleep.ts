import type { RuntimePlan } from "#src/contracts";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export function sleep(_milliseconds: number): RuntimePlan<void> {
  return notImplementedRuntimePrimitive("sleep");
}
