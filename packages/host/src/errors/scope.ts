import type { FailureShape, ScopeFailure, ScopeFailureCause } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

export class ScopeError extends ShajaraError implements ScopeFailure {
  override readonly name = "ScopeError";
  readonly kind = "scope" as const;
  override readonly cause: ScopeFailureCause;
  readonly suppressed: readonly FailureShape[];

  constructor(failure: ScopeFailure) {
    super(failure.message);
    this.cause = failure.cause;
    this.suppressed = failure.suppressed;
  }
}
