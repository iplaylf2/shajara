import type { ECHO_TOKEN, ProcessRef, ScopeRef, SigilShape } from "#/contracts";

export function self<Scope extends ScopeRef<unknown>>(): SelfSigil<Scope> {
  return {
    kind: "self",
  };
}

export interface SelfSigil<Scope extends ScopeRef<unknown>> extends SigilShape {
  readonly kind: "self";
  readonly [ECHO_TOKEN]?: readonly [SelfHandle<Scope>];
}

export interface SelfHandle<Scope extends ScopeRef<unknown>> {
  readonly scope: Scope;
  readonly process: ProcessRef<unknown>;
}
