import type { ContextKey, Plan } from "#src/contracts";
import { bind as bindSyscall } from "#src/syscalls";
import { plan } from "#src/internal/fp";

export function bind<Value>(key: ContextKey<Value>, value: Value): Plan<void> {
  return plan.liftF(bindSyscall(key, value));
}
