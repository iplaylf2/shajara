import type { Failure, ScopeRef, Wisp } from "#src/contracts";
import { awaitScope } from "#src/sigils";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { scopeTerminated } from "#src/failures";
import { unreachable } from "#src/utils";
import { wisp } from "#src/internal/fp";

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
