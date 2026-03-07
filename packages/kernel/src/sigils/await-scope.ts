import type { ScopeExit, ScopeRef, ScopeRefReturn, Sigil } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export function awaitScope<Scope extends ScopeRef<unknown>>(scope: Scope): AwaitScopeSigil<Scope> {
  return {
    kind: "await-scope",
    scope,
  };
}

export interface AwaitScopeSigil<Scope extends ScopeRef<unknown>> extends Sigil {
  readonly kind: "await-scope";
  readonly scope: Scope;
  readonly [RETURN_TOKEN]?: readonly [ScopeExit<ScopeRefReturn<Scope>>];
}
