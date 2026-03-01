import type { Failure, Plan, ScopeSpec } from "#src/contracts";
import type { Either } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";

export function scoped<Return>(
  _plan: Plan<Return>,
  _options?: ScopedOptions,
): Plan<Either<Failure, Return>> {
  return notImplemented("kernel primitive 'scoped'");
}

export interface ScopedOptions {
  readonly onResumableBranchFailure?: ResumableFailureHandler;
  readonly spec?: ScopeSpec;
}

export type ResumableFailureHandler = (failure: Failure) => Plan<Either<Failure, unknown>>;
