import type { ScopeRef } from "#/contracts";

/** Scope reference registered as an executor entry and accepted by external controls. */
export interface ExecutionScopeRef<Relic> extends ScopeRef<Relic> {
  readonly [SCOPE_REF_TOKEN]: "execution-scope";
}

declare const SCOPE_REF_TOKEN: unique symbol;
