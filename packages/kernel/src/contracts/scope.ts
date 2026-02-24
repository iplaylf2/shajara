const SCOPE_REF_TOKEN: unique symbol = Symbol("scope-ref");
const INGRESS_SCOPE_REF_TOKEN: unique symbol = Symbol("ingress-scope-ref");

export interface ScopeRef {
  readonly [SCOPE_REF_TOKEN]: "scope-ref";
}

export interface IngressScopeRef extends ScopeRef {
  readonly [INGRESS_SCOPE_REF_TOKEN]: "ingress-scope-ref";
}
