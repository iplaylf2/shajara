import type { Failure, ProcessExit } from "#src/contracts";
import { either } from "fp-ts";
import { scopeTerminated } from "#src/failures";
import { unreachable } from "#src/utils";

export function unwrapProcessExit<Relic>(
  processExit: ProcessExit<Relic>,
): either.Either<Failure, Relic> {
  switch (processExit.kind) {
    case "completed":
      return either.right(processExit.value);
    case "failed":
      return either.left(processExit.failure);
    case "terminated":
      return either.left(scopeTerminated());
    default:
      return unreachable();
  }
}
