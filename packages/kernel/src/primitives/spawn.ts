import type { Blueprint, Plan, ScopeRef, ScopeSpec } from "#src/contracts";
import type { StandardScopeSpec } from "#src/scopes";
import { spawnScope } from "#src/primitives-kit";
import { standardScopeSpec } from "#src/scopes";

export function spawn<Return, Spec extends ScopeSpec = StandardScopeSpec>(
  entry: Blueprint<Return>,
  spec = standardScopeSpec() as Spec,
): Plan<ScopeRef<Return, Spec>> {
  return spawnScope(entry, spec);
}
