import type { ContextKey, Wisp } from "#src/contracts";
import type { Option } from "#src/utils";
import { lookup as lookupSyscall } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function lookup<Value>(key: ContextKey<Value>): Wisp<Option<Value>> {
  return wisp.liftF(lookupSyscall(key));
}
