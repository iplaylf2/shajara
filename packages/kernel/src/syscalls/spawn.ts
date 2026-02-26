import type { ScopeRef, ScopeSpec } from "#src/contracts/scope";
import type { Blueprint } from "#src/contracts/plan";
import type { ProcessRef } from "#src/contracts/process";
import type { StandardScopeSpec } from "#src/scopes";
import type { Syscall } from "#src/contracts/syscall";

export type SpawnRef<Return = unknown> = ScopeRef<Return>;

export interface SpawnDescriptor<Return> {
  readonly scopeRef: SpawnRef<Return>;
  readonly processRef: ProcessRef<Return>;
}

export interface SpawnSyscall<Return, Spec extends ScopeSpec = StandardScopeSpec> extends Syscall {
  readonly kind: "spawn";
  readonly entry: Blueprint<Return>;
  readonly spec?: Spec;
  readonly return?: readonly [SpawnDescriptor<Return>];
}

export function spawn<Return, Spec extends ScopeSpec = StandardScopeSpec>(
  entry: Blueprint<Return>,
  spec?: Spec,
): SpawnSyscall<Return, Spec> {
  return {
    entry,
    kind: "spawn",
    ...(spec ? { spec } : {}),
  };
}
