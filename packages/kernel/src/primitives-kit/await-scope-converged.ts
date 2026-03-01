import type { Failure, Plan, ScopeRef } from "#src/contracts";
import { awaitScope } from "#src/syscalls";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { scopeTerminated } from "#src/failures";
import { unreachable } from "#src/utils";

export function awaitScopeConverged<Return>(
  scopeRef: ScopeRef<Return>,
): Plan<either.Either<Failure, Return>> {
  return pipe(
    awaitScope(scopeRef),
    plan.liftF,
    plan.map((scopeExit) => {
      switch (scopeExit.kind) {
        case "completed":
          return either.right(scopeExit.value);
        case "failed":
          return either.left(scopeExit.fault);
        case "terminated":
          return either.left(scopeTerminated());
        default:
          return unreachable();
      }
    }),
  );
}
