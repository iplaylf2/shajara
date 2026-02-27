import type { ScopeRef, ScopeSpec } from "#src/contracts";

export interface PortalScopeSpecOptions {}
export interface PortalScopeSpec extends ScopeSpec {
  readonly role: "portal";
}
export type PortalScopeRef<Return> = ScopeRef<Return, PortalScopeSpec>;

export function portalScopeSpec(_options?: PortalScopeSpecOptions): PortalScopeSpec {
  return {
    role: "portal",
  };
}
