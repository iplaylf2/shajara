import type { ContextKey, Wisp } from "#src/contracts";
import { wisp } from "#src/internal/fp";
import { unbind as unbindSyscall } from "#src/sigils";

export function unbind(key: ContextKey<unknown>): Wisp<void> {
  return wisp.liftF(unbindSyscall(key));
}
