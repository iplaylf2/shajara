import type { Plan, ScopeCompletedExit, ScopeRef } from "#src/contracts";
import { awaitScope } from "#src/syscalls";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";

/**
 * Awaits a child scope supervised by the current supervisor scope.
 * "Supervised" is a relative relationship role, not a distinct scope entity.
 */
export function awaitSupervisedScope<Return>(scopeRef: ScopeRef<Return>): Plan<Return> {
  return pipe(
    awaitScope(scopeRef),
    plan.liftF,
    plan.map(narrowAs<ScopeCompletedExit<Return>>()),
    plan.map(({ value }) => value),
  );
}
