import type { ScopeSpec } from "#src/contracts/scope";
import type { SpawnDescriptor } from "#src/syscalls";
import { createScopeSpec } from "#src/scopes-kit/factory";

export interface SupervisorScopeSpecOptions {}
export type SupervisorScopeSpec = ScopeSpec<"supervisor">;

export type SupervisorSpawnDescriptor<Return> = SpawnDescriptor<Return>;

export const supervisorScopeSpec = (options?: SupervisorScopeSpecOptions): SupervisorScopeSpec =>
  createScopeSpec("supervisor", options);
