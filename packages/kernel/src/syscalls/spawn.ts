import type { Blueprint } from "#src/contracts/plan";
import type { ProcessRef } from "#src/contracts/process";
import type { ScopeRef } from "#src/contracts/scope";
import type { Syscall } from "#src/contracts/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface SpawnRef<ReturnValue = unknown> extends ScopeRef {
  readonly _return?: ReturnValue;
}

export interface SpawnDescriptor<ReturnValue, SpawnedRef extends SpawnRef<ReturnValue>> {
  readonly scope: SpawnedRef;
  readonly rootProcess: ProcessRef<ReturnValue>;
  readonly post: <PostedValue>(value: PostedValue) => void;
}

export interface SpawnSyscall<
  ReturnValue,
  SpawnedRef extends SpawnRef<ReturnValue> = SpawnRef<ReturnValue>,
> extends Syscall<SpawnDescriptor<ReturnValue, SpawnedRef>> {
  readonly kind: "spawn";
  readonly blueprint: Blueprint<ReturnValue>;
}

export function spawn<
  ReturnValue,
  SpawnedRef extends SpawnRef<ReturnValue> = SpawnRef<ReturnValue>,
>(_blueprint: Blueprint<ReturnValue>): SpawnSyscall<ReturnValue, SpawnedRef> {
  return notImplemented("kernel syscall 'spawn'");
}
