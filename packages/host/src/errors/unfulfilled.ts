import { ShajaraError } from "#/contracts";
import type { UnfulfilledFailure } from "@shajara/kernel";

/** Error thrown when a future's owner scope closes before the future settles. */
export class UnfulfilledError extends ShajaraError implements UnfulfilledFailure {
  public constructor() {
    super("Future was not fulfilled before its owner scope closed");
  }

  public override readonly name = "UnfulfilledError";
  public readonly kind = "unfulfilled" as const;
}
