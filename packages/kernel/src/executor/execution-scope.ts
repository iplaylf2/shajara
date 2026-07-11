import type { ScopeRef } from "#/contracts/index.js";

/** Scope reference accepted by executor controls. */
export interface ExecutionScopeRef<Relic> extends ScopeRef<Relic> {
  readonly [SCOPE_REF_TOKEN]: "execution-scope";
}

declare const SCOPE_REF_TOKEN: unique symbol;
