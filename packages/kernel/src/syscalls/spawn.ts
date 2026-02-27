import type { ScopeRef, ScopeSpec } from "#src/contracts/scope";
import type { Blueprint } from "#src/contracts/plan";
import type { ProcessRef } from "#src/contracts/process";
import type { Syscall } from "#src/contracts/syscall";

export type SpawnRef<Return> = ScopeRef<Return>;

export interface SpawnDescriptor<Return> {
  readonly scopeRef: SpawnRef<Return>;
  readonly processRef: ProcessRef<Return>;
}

export interface SpawnSyscall<Return> extends Syscall {
  readonly kind: "spawn";
  readonly entry: Blueprint<Return>;
  readonly spec?: ScopeSpec;
  readonly return?: readonly [SpawnDescriptor<Return>];
}

export function spawn<Return>(entry: Blueprint<Return>, spec?: ScopeSpec): SpawnSyscall<Return> {
  return {
    entry,
    kind: "spawn",
    ...(spec ? { spec } : {}),
  };
}
