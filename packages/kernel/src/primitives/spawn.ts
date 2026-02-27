import type { Plan, ScopeRef, ScopeSpec } from "#src/contracts";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { spawn as spawnSyscall } from "#src/syscalls";

export function spawn<Return, Spec extends ScopeSpec>(
  spawnedPlan: Plan<Return>,
  spec?: Spec,
): Plan<ScopeRef<Return, Spec>> {
  return pipe(
    spawnSyscall(() => spawnedPlan, spec),
    plan.liftF,
    plan.map(({ scopeRef }) => scopeRef),
  );
}
