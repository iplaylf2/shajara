import type { ScopeSpec } from "#src/contracts/scope";

export interface PortalScopeSpecOptions {}
export interface PortalScopeSpec extends ScopeSpec {
  readonly role: "portal";
}

export const portalScopeSpec = (_options?: PortalScopeSpecOptions): PortalScopeSpec => ({
  role: "portal",
});
