import type { InterruptedFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

/** Error thrown when runtime progression is interrupted outside normal convergence. */
export class InterruptedError extends ShajaraError implements InterruptedFailure {
  /**
   * Creates an interrupted error from an interrupted failure.
   *
   * @param failure - Interrupted failure represented by the error.
   */
  public constructor(failure: InterruptedFailure) {
    super(failure.message);
    this.cause = failure.cause;
  }

  public override readonly name = "InterruptedError";
  public readonly kind = "interrupted" as const;
  public override readonly cause: unknown;
}
