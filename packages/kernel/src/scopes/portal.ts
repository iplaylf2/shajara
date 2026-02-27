import type { ScopeSpec } from "#src/contracts/scope";

export interface PortalScopeSpecOptions {}
export interface PortalScopeSpec extends ScopeSpec {
  readonly role: "portal";
}

export function portalScopeSpec(_options?: PortalScopeSpecOptions): PortalScopeSpec {
  return {
    role: "portal",
  };
}
