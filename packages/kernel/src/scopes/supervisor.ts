import type { SpawnDescriptor, SpawnRef } from "#src/syscalls";
import type { Either } from "fp-ts/Either";
import type { ScopeSpec } from "#src/contracts/scope";
import { createScopeSpec } from "#src/scopes-kit/factory";

export interface SupervisorScopeSpecOptions {}

export type SupervisorSpawnDescriptor<ReturnValue> = SpawnDescriptor<
  Either<unknown, ReturnValue>,
  SpawnRef<Either<unknown, ReturnValue>>
>;

export const supervisorScopeSpec = (
  options?: SupervisorScopeSpecOptions,
): ScopeSpec<"supervisor"> => createScopeSpec("supervisor", options);
