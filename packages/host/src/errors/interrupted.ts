import type { InterruptedFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

export class InterruptedError extends ShajaraError implements InterruptedFailure {
  public constructor(failure: InterruptedFailure) {
    super(failure.message);
    this.cause = failure.cause;
  }

  public override readonly name = "InterruptedError";
  public readonly kind = "interrupted" as const;
  public override readonly cause: unknown;
}
