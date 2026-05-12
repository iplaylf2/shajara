import type { ScopeRef } from "#/contracts";

/** Scope reference registered with an executor for external launch and control. */
export interface ExecutionScopeRef<Relic> extends ScopeRef<Relic> {
  readonly [SCOPE_REF_TOKEN]: "execution-scope";
}

declare const SCOPE_REF_TOKEN: unique symbol;
