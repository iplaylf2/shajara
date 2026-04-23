import type { CanceledFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

export class CanceledError extends ShajaraError implements CanceledFailure {
  public constructor() {
    super("Canceled before completion");
  }

  public override readonly name = "CanceledError";
  public readonly kind = "canceled" as const;
}
