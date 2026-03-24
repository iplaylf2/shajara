import type { ContextKey, Wisp } from "#/contracts";
import type { Option } from "#/utils";
import { lookup as lookupSigil } from "#/sigils";
import { wisp } from "#/internal/fp";

export function lookup<Value>(key: ContextKey<Value>): Wisp<Option<Value>> {
  return wisp.liftF(lookupSigil(key));
}
