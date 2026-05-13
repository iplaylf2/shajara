import type { ContextKey, Wisp } from "#/contracts";
import type { Option } from "#/utils/index";
import { lookup as lookupSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Resolves context from the scope chain.
 *
 * @returns Nearest visible binding, or `none` when absent.
 */
export function lookup<Value>(key: ContextKey<Value>): Wisp<Option<Value>> {
  return wisp.liftF(lookupSigil(key));
}
