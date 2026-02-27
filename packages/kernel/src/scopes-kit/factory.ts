import type { ScopeSpec } from "#src/contracts/scope";
import { notImplemented } from "#src/internal/not-implemented";

export function createScopeSpec<Role extends string, Options>(
  _role: Role,
  _options?: Options,
): ScopeSpec<Role> {
  return notImplemented("kernel scope spec factory");
}
