import type { ContextKey, Plan } from "#src/contracts";
import { plan } from "#src/internal/fp";
import { unbind as unbindSyscall } from "#src/syscalls";

export function unbind(key: ContextKey<unknown>): Plan<void> {
  return plan.liftF(unbindSyscall(key));
}
