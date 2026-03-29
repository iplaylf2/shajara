import type { FailureShape, ScopeFailure, ScopeFailureCause } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

export class ScopeError extends ShajaraError implements ScopeFailure {
  override readonly name = "ScopeError";
  readonly kind = "scope" as const;
  override readonly cause: ScopeFailureCause;
  readonly suppressedFailures: readonly FailureShape[];

  constructor(failure: ScopeFailure) {
    super(failure.message);
    this.cause = failure.cause;
    this.suppressedFailures = failure.suppressedFailures;
  }
}
