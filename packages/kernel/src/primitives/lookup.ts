import type { ContextKey, Wisp } from "#/contracts";
import type { Option } from "#/utils/index";
import { lookup as lookupSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Resolves context from the scope chain.
 *
 * @param key - Lookup identity.
 * @returns Nearest value, or none.
 */
export function lookup<Value>(key: ContextKey<Value>): Wisp<Option<Value>> {
  return wisp.liftF(lookupSigil(key));
}
