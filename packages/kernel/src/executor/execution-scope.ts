import type { ScopeRef } from "#/contracts";

/** Execution-scope reference accepted by executor launch and control methods. */
export interface ExecutionScopeRef<Relic> extends ScopeRef<Relic> {
  readonly [SCOPE_REF_TOKEN]: "execution-scope";
}

declare const SCOPE_REF_TOKEN: unique symbol;
