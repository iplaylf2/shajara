import type { ScopeSpec } from "#src/contracts/scope";
import { createScopeSpec } from "#src/scopes-kit/factory";

export interface SupervisorScopeSpecOptions {}

export const supervisorScopeSpec = (
  options?: SupervisorScopeSpecOptions,
): ScopeSpec<"supervisor"> => createScopeSpec("supervisor", options);
