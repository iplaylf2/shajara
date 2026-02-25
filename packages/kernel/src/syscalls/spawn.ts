import type { Blueprint } from "#src/contracts/plan";
import type { ProcessRef } from "#src/contracts/process";
import type { ScopeRef } from "#src/contracts/scope";
import type { Syscall } from "#src/contracts/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface SpawnRef<ReturnValue = unknown> extends ScopeRef {
  readonly _return?: ReturnValue;
}

export interface SpawnDescriptor<ReturnValue, SpawnedRef extends SpawnRef<ReturnValue>> {
  readonly scopeRef: SpawnedRef;
  readonly rootProcessRef: ProcessRef<ReturnValue>;
}

export interface SpawnSyscall<
  ReturnValue,
  SpawnedRef extends SpawnRef<ReturnValue> = SpawnRef<ReturnValue>,
> extends Syscall {
  readonly kind: "spawn";
  readonly blueprint: Blueprint<ReturnValue>;
  readonly return: readonly [SpawnDescriptor<ReturnValue, SpawnedRef>];
}

export function spawn<
  ReturnValue,
  SpawnedRef extends SpawnRef<ReturnValue> = SpawnRef<ReturnValue>,
>(_blueprint: Blueprint<ReturnValue>): SpawnSyscall<ReturnValue, SpawnedRef> {
  return notImplemented("kernel syscall 'spawn'");
}
