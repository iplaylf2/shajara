import type { Failure, Wisp, ScopeRef } from "#src/contracts";
import { awaitScope } from "#src/sigils";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";
import { scopeTerminated } from "#src/failures";
import { unreachable } from "#src/utils";

export function awaitScopeConverged<Return>(
  scopeRef: ScopeRef<Return>,
): Wisp<either.Either<Failure, Return>> {
  return pipe(
    awaitScope(scopeRef),
    wisp.liftF,
    wisp.map((scopeExit) => {
      switch (scopeExit.kind) {
        case "completed":
          return either.right(scopeExit.value);
        case "failed":
          return either.left(scopeExit.failure);
        case "terminated":
          return either.left(scopeTerminated());
        default:
          return unreachable();
      }
    }),
  );
}
