import type { ScopeSpec } from "#src/contracts";

export function supervisorScopeSpec(_options?: SupervisorScopeSpecOptions): SupervisorScopeSpec {
  return {
    role: "supervisor",
  };
}

export interface SupervisorScopeSpecOptions {}
export interface SupervisorScopeSpec extends ScopeSpec {
  readonly role: "supervisor";
}
