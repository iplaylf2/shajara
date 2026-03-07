import type { ProcessRef, RETURN_TOKEN, ScopeRef, Sigil } from "#src/contracts";

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
