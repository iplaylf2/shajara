const SCOPE_REF_TOKEN: unique symbol = Symbol("scope-ref");

export interface ScopeRef {
  readonly [SCOPE_REF_TOKEN]: "scope-ref";
}
