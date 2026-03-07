import type { ProcessRef, RETURN_TOKEN, Ritual, ScopeRef, ScopeSpec, Sigil } from "#src/contracts";
import { standardScopeSpec } from "#src/scopes/standard";

export function spawn<Relic>(
  entry: Ritual<Relic>,
  spec: ScopeSpec = standardScopeSpec(),
): SpawnSigil<Relic> {
  return {
    entry,
    kind: "spawn",
    spec,
  };
}

export interface SpawnSigil<Relic> extends Sigil {
  readonly kind: "spawn";
  readonly entry: Ritual<Relic>;
  readonly spec: ScopeSpec;
  readonly [RETURN_TOKEN]?: readonly [SpawnDescriptor<Relic>];
}

export interface SpawnDescriptor<Relic> {
  readonly scopeRef: ScopeRef<Relic>;
  readonly processRef: ProcessRef<Relic>;
}
