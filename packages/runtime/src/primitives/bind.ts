import type { ContextKey, RiteCoroutine } from "#src/contracts";
import { bind as kernelBind } from "@shajara/kernel";
import { liftBlueprint } from "#src/boundary";

export function bind<Value>(key: ContextKey<Value>, value: Value): RiteCoroutine<void> {
  return liftBlueprint(() => kernelBind(key, value))();
}
