import type { ScopeRef, ScopeSpec } from "#src/contracts";
import type { SpawnDescriptor } from "#src/syscalls";

export type SupervisorScopeRef<Return> = ScopeRef<Return, SupervisorScopeSpec>;

export type SupervisorSpawnDescriptor<Return> = SpawnDescriptor<Return, SupervisorScopeSpec>;

export function supervisorScopeSpec(_options?: SupervisorScopeSpecOptions): SupervisorScopeSpec {
  return {
    role: "supervisor",
  };
}

export interface SupervisorScopeSpecOptions {}
export interface SupervisorScopeSpec extends ScopeSpec {
  readonly role: "supervisor";
}
