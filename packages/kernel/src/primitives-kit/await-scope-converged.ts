import type { KhoraFailure, Plan, ScopeRef } from "#src/contracts";
import { left, right, unreachable } from "#src/utils";
import type { Either } from "#src/utils";
import { awaitScope } from "#src/syscalls";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { scopeTerminated } from "#src/failures";

export function awaitScopeConverged<Return>(
  scopeRef: ScopeRef<Return>,
): Plan<Either<KhoraFailure, Return>> {
  return pipe(
    awaitScope(scopeRef),
    plan.liftF,
    plan.map((scopeExit) => {
      switch (scopeExit.kind) {
        case "completed":
          return right(scopeExit.value);
        case "failed":
          return left(scopeExit.fault);
        case "terminated":
          return left(scopeTerminated(scopeRef));
        default:
          return unreachable();
      }
    }),
  );
}
