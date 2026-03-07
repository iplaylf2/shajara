import type { ECHO_TOKEN, ScopeExit, ScopeRef, ScopeRefRelic, Sigil } from "#src/contracts";

export function awaitScope<Scope extends ScopeRef<unknown>>(scope: Scope): AwaitScopeSigil<Scope> {
  return {
    kind: "await-scope",
    scope,
  };
}

export interface AwaitScopeSigil<Scope extends ScopeRef<unknown>> extends Sigil {
  readonly kind: "await-scope";
  readonly scope: Scope;
  readonly [ECHO_TOKEN]?: readonly [ScopeExit<ScopeRefRelic<Scope>>];
}
