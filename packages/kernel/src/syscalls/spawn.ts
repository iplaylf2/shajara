import type { Blueprint, ProcessRef, ScopeRef, ScopeSpec, Syscall } from "#src/contracts";

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
