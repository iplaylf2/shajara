import type { ProcessRef, ScopeRef, Sigil } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export function self<Scope extends ScopeRef<unknown>>(): SelfSigil<Scope> {
  return {
    kind: "self",
  };
}

export interface SelfSigil<Scope extends ScopeRef<unknown>> extends Sigil {
  readonly kind: "self";
  readonly [RETURN_TOKEN]?: readonly [SelfDescriptor<Scope>];
}

export interface SelfDescriptor<Scope extends ScopeRef<unknown>> {
  readonly scopeRef: Scope;
  readonly processRef: ProcessRef<unknown>;
}
