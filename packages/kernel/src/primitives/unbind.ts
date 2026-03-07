import type { ContextKey, Wisp } from "#src/contracts";
import { plan } from "#src/internal/fp";
import { unbind as unbindSyscall } from "#src/syscalls";

export function unbind(key: ContextKey<unknown>): Wisp<void> {
  return plan.liftF(unbindSyscall(key));
}
