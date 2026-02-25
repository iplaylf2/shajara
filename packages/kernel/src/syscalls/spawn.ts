import type { Blueprint } from "#src/contracts/plan";
import type { ProcessRef } from "#src/contracts/process";
import type { ScopeRef } from "#src/contracts/scope";
import type { Syscall } from "#src/contracts/syscall";

export type SpawnRef<ReturnValue = unknown> = ScopeRef<ReturnValue>;

export interface SpawnDescriptor<ReturnValue, SpawnedRef extends SpawnRef<ReturnValue>> {
  readonly scopeRef: SpawnedRef;
  readonly processRef: ProcessRef<ReturnValue>;
}

export interface SpawnSyscall<
  ReturnValue,
  SpawnedRef extends SpawnRef<ReturnValue> = SpawnRef<ReturnValue>,
> extends Syscall {
  readonly kind: "spawn";
  readonly blueprint: Blueprint<ReturnValue>;
  readonly return?: readonly [SpawnDescriptor<ReturnValue, SpawnedRef>];
}

export function spawn<
  ReturnValue,
  SpawnedRef extends SpawnRef<ReturnValue> = SpawnRef<ReturnValue>,
>(blueprint: Blueprint<ReturnValue>): SpawnSyscall<ReturnValue, SpawnedRef> {
  return {
    blueprint,
    kind: "spawn",
  };
}
