import { left, right } from "fp-ts/Either";
import type { Either } from "fp-ts/Either";
import type { KhoraFailure } from "#src/contracts/failure";
import type { Plan } from "#src/contracts/plan";
import type { ScopeRef } from "#src/contracts/scope";
import { awaitScope } from "#src/syscalls";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp/plan";
import { scopeTerminated } from "#src/failures";
import { unreachable } from "#src/utils/unreachable";

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
