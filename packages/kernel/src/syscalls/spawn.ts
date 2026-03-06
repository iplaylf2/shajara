import type { Blueprint, ProcessRef, ScopeRef, ScopeSpec, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";
import { standardScopeSpec } from "#src/scopes/standard";

export function spawn<Return>(
  entry: Blueprint<Return>,
  spec: ScopeSpec = standardScopeSpec(),
): SpawnSyscall<Return> {
  return {
    entry,
    kind: "spawn",
    spec,
  };
}

export interface SpawnSyscall<Return> extends Syscall {
  readonly kind: "spawn";
  readonly entry: Blueprint<Return>;
  readonly spec: ScopeSpec;
  readonly [RETURN_TOKEN]?: readonly [SpawnDescriptor<Return>];
}

export interface SpawnDescriptor<Return> {
  readonly scopeRef: ScopeRef<Return>;
  readonly processRef: ProcessRef<Return>;
}
