import type { ContextKey, RuntimePlan } from "#src/contracts";
import { bind as kernelBind } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export function bind<Value>(key: ContextKey<Value>, value: Value): RuntimePlan<void> {
  return liftPlan(kernelBind(key, value));
}
