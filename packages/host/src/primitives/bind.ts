import type { ContextKey, RiteCoroutine } from "#/contracts/index.js";
import { encodeRitual } from "#/boundary/index.js";
import { bind as kernelBind } from "@shajara/kernel";

/** Adds or shadows a context binding on the current scope. */
export function bind<Value>(key: ContextKey<Value>, value: Value): RiteCoroutine<void> {
  return encodeRitual(() => kernelBind(key, value))();
}
