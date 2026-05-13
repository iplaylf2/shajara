import type { ContextKey, RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { bind as kernelBind } from "@shajara/kernel";

/**
 * Binds a value in the current scope context.
 *
 * @param key - Context identity.
 * @param value - Value to bind.
 * @returns Completion after the binding is installed.
 */
export function bind<Value>(key: ContextKey<Value>, value: Value): RiteCoroutine<void> {
  return encodeRitual(() => kernelBind(key, value))();
}
