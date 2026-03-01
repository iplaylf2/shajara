import type { Failure, Plan } from "#src/contracts";
import type { Either } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";

export function scoped<Return>(
  _scopePlan: Plan<Return>,
  _onResumableBranchFailure?: ResumableFailureHandler,
): Plan<Either<Failure, Return>> {
  return notImplemented("kernel primitive 'scoped'");
}

export type ResumableFailureHandler = (failure: Failure) => Plan<Either<Failure, unknown>>;
