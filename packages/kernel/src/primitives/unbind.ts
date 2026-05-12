import type { ContextKey, Wisp } from "#/contracts";
import { unbind as unbindSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Removes a current-scope context binding.
 *
 * @param key - Binding identity.
 * @returns Completion after unbinding.
 */
export function unbind(key: ContextKey<unknown>): Wisp<void> {
  return wisp.liftF(unbindSigil(key));
}
