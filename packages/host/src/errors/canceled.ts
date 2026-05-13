import type { CanceledFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

/** Error thrown when a routine, future, or scope is canceled before completion. */
export class CanceledError extends ShajaraError implements CanceledFailure {
  public constructor() {
    super("Canceled before completion");
  }

  public override readonly name = "CanceledError";
  public readonly kind = "canceled" as const;
}
