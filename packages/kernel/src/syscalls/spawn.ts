import type { Plan } from "#src/plan";
import type { ScopeRef } from "#src/executor";
import type { Syscall } from "#src/syscalls-kit/syscall";

export interface SpawnRef<ReturnValue = unknown> extends ScopeRef {
  readonly _return?: ReturnValue;
}

export interface SpawnSyscall<
  ReturnValue,
  SpawnedRef = SpawnRef<ReturnValue>,
> extends Syscall<SpawnedRef> {
  readonly kind: "spawn";
  readonly plan: Plan<ReturnValue>;
}

export function spawn<ReturnValue, SpawnedRef = SpawnRef<ReturnValue>>(
  plan: Plan<ReturnValue>,
): SpawnSyscall<ReturnValue, SpawnedRef> {
  return {
    kind: "spawn",
    plan,
  };
}
