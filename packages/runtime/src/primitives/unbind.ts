import type { ContextKey, RuntimePlan } from "#src/contracts";
import { unbind as kernelUnbind } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export function unbind(key: ContextKey<unknown>): RuntimePlan<void> {
  return liftPlan(kernelUnbind(key));
}
