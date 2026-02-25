import type { ScopeRef, ScopeSpec } from "#src/contracts/scope";
import { createScopeSpec } from "#src/scopes-kit/factory";

const INGRESS_SCOPE_REF_TOKEN: unique symbol = Symbol("ingress-scope-ref");

export interface IngressScopeRef extends ScopeRef {
  readonly [INGRESS_SCOPE_REF_TOKEN]: "ingress-scope-ref";
}

export interface IngressScopeSpecOptions {}

export const ingressScopeSpec = (options?: IngressScopeSpecOptions): ScopeSpec<"ingress"> =>
  createScopeSpec("ingress", options);
