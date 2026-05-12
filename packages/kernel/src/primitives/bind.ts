import type { ContextKey, Wisp } from "#/contracts";
import { bind as bindSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Adds a context binding to the current scope.
 *
 * @param key - Binding identity.
 * @param value - Bound value.
 * @returns Completion after binding.
 */
export function bind<Value>(key: ContextKey<Value>, value: Value): Wisp<void> {
  return wisp.liftF(bindSigil(key, value));
}
