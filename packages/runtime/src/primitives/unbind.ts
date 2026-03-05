import type { ContextKey, RuntimePlan } from "#src/contracts";
import { unbind as kernelUnbind } from "@khora/kernel/primitives";
import { liftBlueprint } from "#src/boundary";

export function unbind(key: ContextKey<unknown>): RuntimePlan<void> {
  return liftBlueprint(() => kernelUnbind(key));
}
