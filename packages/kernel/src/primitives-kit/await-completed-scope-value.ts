import type { AwaitScopeExit } from "#src/syscalls";
import type { Plan } from "#src/contracts/plan";
import type { ScopeRef } from "#src/contracts/scope";
import { assume } from "#src/utils/assume";
import { awaitScope } from "#src/syscalls";
import { pipe } from "fp-ts/lib/function";
import { plan } from "#src/internal/fp/plan";

type CompletedAwaitScopeExit<ReturnValue> = Extract<
  AwaitScopeExit<ReturnValue>,
  { readonly kind: "completed" }
>;

export function awaitCompletedScopeValue<ReturnValue>(
  scopeRef: ScopeRef<ReturnValue>,
): Plan<ReturnValue> {
  return pipe(
    awaitScope(scopeRef),
    plan.liftF,
    plan.map(assume<CompletedAwaitScopeExit<ReturnValue>>),
    plan.map(({ value }) => value),
  );
}
