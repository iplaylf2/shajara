import type { ContextKey, RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { bind as kernelBind } from "@shajara/kernel";

/** Adds or shadows a context binding on the current scope. */
export function bind<Value>(key: ContextKey<Value>, value: Value): RiteCoroutine<void> {
  return encodeRitual(() => kernelBind(key, value))();
}
