import type { ScopeSpec } from "#src/contracts/scope";
import { createScopeSpec } from "#src/scopes-kit/factory";

export interface PortalScopeSpecOptions {}

export const portalScopeSpec = (options?: PortalScopeSpecOptions): ScopeSpec<"portal"> =>
  createScopeSpec("portal", options);
