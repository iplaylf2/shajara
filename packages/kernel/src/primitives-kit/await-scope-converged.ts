import type { Failure, ScopeRef, Wisp } from "#src/contracts";
import { awaitFuture } from "#src/primitives/await-future";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { scopeTerminated } from "#src/failures";
import { unreachable } from "#src/utils";
import { wisp } from "#src/internal/fp";

export function awaitScopeConverged<Relic>(
  scopeRef: ScopeRef<Relic>,
): Wisp<either.Either<Failure, Relic>> {
  return pipe(
    awaitFuture(scopeRef.exitFuture),
    wisp.map(({ right: scopeExit }) => {
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
