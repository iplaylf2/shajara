import type { InterruptedFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

export class InterruptedError extends ShajaraError implements InterruptedFailure {
  override readonly name = "InterruptedError";
  readonly kind = "interrupted" as const;
  override readonly cause: unknown;

  constructor(failure: InterruptedFailure) {
    super(failure.message);
    this.cause = failure.cause;
  }
}
