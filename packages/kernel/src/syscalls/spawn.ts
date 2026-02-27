import type { Blueprint, ProcessRef, ScopeRef, ScopeSpec, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";
import { standardScopeSpec } from "#src/scopes/standard";
import type { StandardScopeSpec } from "#src/scopes/standard";

export interface SpawnDescriptor<Return, Spec extends ScopeSpec> {
  readonly scopeRef: ScopeRef<Return, Spec>;
  readonly processRef: ProcessRef<Return>;
}

export interface SpawnSyscall<Return, Spec extends ScopeSpec> extends Syscall {
  readonly kind: "spawn";
  readonly entry: Blueprint<Return>;
  readonly spec: Spec;
  readonly [RETURN_TOKEN]?: readonly [SpawnDescriptor<Return, Spec>];
}
export function spawn<Return, Spec extends ScopeSpec = StandardScopeSpec>(
  entry: Blueprint<Return>,
  spec = standardScopeSpec() as Spec,
): SpawnSyscall<Return, Spec> {
  return {
    entry,
    kind: "spawn",
    spec,
  };
}
