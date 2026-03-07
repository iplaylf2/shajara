import type { ProcessRef, Ritual, ScopeRef, ScopeSpec, Sigil } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";
import { standardScopeSpec } from "#src/scopes/standard";

export function spawn<Return>(
  entry: Ritual<Return>,
  spec: ScopeSpec = standardScopeSpec(),
): SpawnSigil<Return> {
  return {
    entry,
    kind: "spawn",
    spec,
  };
}

export interface SpawnSigil<Return> extends Sigil {
  readonly kind: "spawn";
  readonly entry: Ritual<Return>;
  readonly spec: ScopeSpec;
  readonly [RETURN_TOKEN]?: readonly [SpawnDescriptor<Return>];
}

export interface SpawnDescriptor<Return> {
  readonly scopeRef: ScopeRef<Return>;
  readonly processRef: ProcessRef<Return>;
}
