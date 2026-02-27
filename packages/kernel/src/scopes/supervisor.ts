import type { ScopeSpec } from "#src/contracts";
import type { SpawnDescriptor } from "#src/syscalls";

export interface SupervisorScopeSpecOptions {}
export interface SupervisorScopeSpec extends ScopeSpec {
  readonly role: "supervisor";
}

export type SupervisorSpawnDescriptor<Return> = SpawnDescriptor<Return, ScopeSpec>;

export function supervisorScopeSpec(_options?: SupervisorScopeSpecOptions): SupervisorScopeSpec {
  return {
    role: "supervisor",
  };
}
