import type { ScopeRef, ScopeSpec } from "#src/contracts/scope";

const INGRESS_SCOPE_REF_TOKEN: unique symbol = Symbol("ingress-scope-ref");

export interface IngressScopeRef extends ScopeRef<unknown> {
  readonly [INGRESS_SCOPE_REF_TOKEN]: "ingress-scope-ref";
}

export interface IngressScopeSpecOptions {}
export interface IngressScopeSpec extends ScopeSpec {
  readonly role: "ingress";
}

export const ingressScopeSpec = (_options?: IngressScopeSpecOptions): IngressScopeSpec => ({
  role: "ingress",
});
