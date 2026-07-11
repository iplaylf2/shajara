import type { FailureShape, ScopeFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts/index.js";

/** Error thrown when a scope closes with a failure. */
export class ScopeError extends ShajaraError implements ScopeFailure {
  /**
   * Creates a scope error from a scope failure.
   *
   * @param failure - Scope failure represented by the error.
   */
  public constructor(failure: ScopeFailure) {
    super(failure.message);
    this.cause = failure.cause;
    this.suppressed = failure.suppressed;
  }

  public override readonly name = "ScopeError";
  public readonly kind = "scope" as const;
  /** Primary failure that caused the scope to fail. */
  public override readonly cause: FailureShape;
  /** Additional failures captured after the scope began failing. */
  public readonly suppressed: readonly FailureShape[];
}
