import type { Failure, ScopeExit } from "#src/contracts";
import { either } from "fp-ts";
import { scopeTerminated } from "#src/failures";
import { unreachable } from "#src/utils";

export function unwrapScopeExit<Relic>(scopeExit: ScopeExit<Relic>): either.Either<Failure, Relic> {
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
}
