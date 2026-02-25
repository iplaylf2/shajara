import type { ScopeSpec } from "#src/contracts/scope";

export function createScopeSpec<Role extends string, Options>(
  role: Role,
  _options?: Options,
): ScopeSpec<Role> {
  return { role } as ScopeSpec<Role>;
}
