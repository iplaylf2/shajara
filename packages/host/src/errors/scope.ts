import type { FailureShape, ScopeFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

export class ScopeError extends ShajaraError implements ScopeFailure {
  public constructor(failure: ScopeFailure) {
    super(failure.message);
    this.cause = failure.cause;
    this.suppressed = failure.suppressed;
  }

  public override readonly name = "ScopeError";
  public readonly kind = "scope" as const;
  public override readonly cause: FailureShape;
  public readonly suppressed: readonly FailureShape[];
}
