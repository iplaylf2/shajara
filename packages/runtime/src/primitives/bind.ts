import type { ContextKey, RuntimePlan } from "#src/contracts";
import { bind as kernelBind } from "@khora/kernel/primitives";
import { liftBlueprint } from "#src/boundary";

export function bind<Value>(key: ContextKey<Value>, value: Value): RuntimePlan<void> {
  return liftBlueprint(() => kernelBind(key, value));
}
