import type { RuntimePlan } from "#src/contracts";
import { bind as kernelBind } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export function bind<Key extends string, Value>(key: Key, value: Value): RuntimePlan<void> {
  return liftPlan(kernelBind(key, value));
}
