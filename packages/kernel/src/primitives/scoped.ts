import type { Blueprint, Failure, Plan } from "#src/contracts";
import type { Either } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";

export function scoped<Return>(
  _entry: Blueprint<Return>,
  _onResumableRecovery?: ResumableRecoveryHandler,
): Plan<Either<Failure, Return>> {
  return notImplemented("kernel primitive 'scoped'");
}

export type ResumableRecoveryHandler = (failure: Failure) => Plan<Either<Failure, unknown>>;
