import type { ContextKey, RiteCoroutine } from "#src/contracts";
import { encodeRitual } from "#src/boundary";
import { bind as kernelBind } from "@shajara/kernel";

export function bind<Value>(key: ContextKey<Value>, value: Value): RiteCoroutine<void> {
  return encodeRitual(() => kernelBind(key, value))();
}
