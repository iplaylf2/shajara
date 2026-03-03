import type { Plan, ScopeCompletedExit, ScopeRef } from "#src/contracts";
import { awaitScope } from "#src/syscalls";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";

/**
 * Awaits a child scope through the in-band completion path only.
 * Non-completed exits are treated as invalid for this helper.
 */
export function awaitScopeInBand<Return>(scopeRef: ScopeRef<Return>): Plan<Return> {
  return pipe(
    awaitScope(scopeRef),
    plan.liftF,
    plan.map(narrowAs<ScopeCompletedExit<Return>>()),
    plan.map(({ value }) => value),
  );
}
