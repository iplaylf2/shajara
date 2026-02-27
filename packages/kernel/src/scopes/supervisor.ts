import type { ScopeSpec } from "#src/contracts/scope";
import type { SpawnDescriptor } from "#src/syscalls";

export interface SupervisorScopeSpecOptions {}
export interface SupervisorScopeSpec extends ScopeSpec {
  readonly role: "supervisor";
}

export type SupervisorSpawnDescriptor<Return> = SpawnDescriptor<Return>;

export const supervisorScopeSpec = (
  _options?: SupervisorScopeSpecOptions,
): SupervisorScopeSpec => ({
  role: "supervisor",
});
