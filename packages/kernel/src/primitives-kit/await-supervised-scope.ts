import type { AwaitScopeExit } from "#src/syscalls";
import type { Plan } from "#src/contracts/plan";
import type { ScopeRef } from "#src/contracts/scope";
import { awaitScope } from "#src/syscalls";
import { narrowAs } from "#src/utils/narrow.js";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp/plan";

type CompletedAwaitScopeExit<ReturnValue> = Extract<
  AwaitScopeExit<ReturnValue>,
  { readonly kind: "completed" }
>;

/**
 * Awaits a child scope supervised by the current supervisor scope.
 * "Supervised" is a relative relationship role, not a distinct scope entity.
 */
export function awaitSupervisedScope<ReturnValue>(
  scopeRef: ScopeRef<ReturnValue>,
): Plan<ReturnValue> {
  return pipe(
    awaitScope(scopeRef),
    plan.liftF,
    plan.map(narrowAs<CompletedAwaitScopeExit<ReturnValue>>()),
    plan.map(({ value }) => value),
  );
}
