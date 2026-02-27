import type { Plan, ScopeRef, ScopeSpec } from "#src/contracts";
import type { StandardScopeSpec } from "#src/scopes";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { spawn as spawnSyscall } from "#src/syscalls";
import { standardScopeSpec } from "#src/scopes";

export function spawn<Return, Spec extends ScopeSpec = StandardScopeSpec>(
  spawnedPlan: Plan<Return>,
  spec = standardScopeSpec() as Spec,
): Plan<ScopeRef<Return, Spec>> {
  return pipe(
    spawnSyscall(() => spawnedPlan, spec),
    plan.liftF,
    plan.map(({ scopeRef }) => scopeRef),
  );
}
