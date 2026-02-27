import type { ScopeRef, ScopeSpec } from "#src/contracts";

export interface IngressScopeSpecOptions {}
export interface IngressScopeSpec extends ScopeSpec {
  readonly role: "ingress";
}

export type IngressScopeRef<Return> = ScopeRef<Return, IngressScopeSpec>;

export function ingressScopeSpec(_options?: IngressScopeSpecOptions): IngressScopeSpec {
  return {
    role: "ingress",
  };
}
