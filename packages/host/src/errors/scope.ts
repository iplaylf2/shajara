import type { FailureShape, ScopeFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

/** Error thrown when a scope converges through its local failure path. */
export class ScopeError extends ShajaraError implements ScopeFailure {
  /**
   * Creates a scope error from a scope failure.
   *
   * @param failure - Scope failure to expose as an error.
   */
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
