import type { ContextKey, Wisp } from "#/contracts/index.js";
import type { Option } from "#/utils/index.js";
import { lookup as lookupSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/**
 * Resolves the nearest visible binding for a context key.
 *
 * @returns Nearest visible binding, or `none` when absent.
 */
export function lookup<Value>(key: ContextKey<Value>): Wisp<Option<Value>> {
  return wisp.liftF(lookupSigil(key));
}
