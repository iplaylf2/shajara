import type { AwaitScopeExit } from "#src/syscalls";
import type { Plan } from "#src/contracts/plan";
import type { ScopeRef } from "#src/contracts/scope";
import { awaitScope } from "#src/syscalls";
import { narrowAs } from "#src/utils/narrow.js";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp/plan";

type CompletedAwaitScopeExit<Return> = Extract<
  AwaitScopeExit<Return>,
  { readonly kind: "completed" }
>;

/**
 * Awaits a child scope supervised by the current supervisor scope.
 * "Supervised" is a relative relationship role, not a distinct scope entity.
 */
export function awaitSupervisedScope<Return>(scopeRef: ScopeRef<Return>): Plan<Return> {
  return pipe(
    awaitScope(scopeRef),
    plan.liftF,
    plan.map(narrowAs<CompletedAwaitScopeExit<Return>>()),
    plan.map(({ value }) => value),
  );
}
