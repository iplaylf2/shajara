import type { CanceledFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

export class CanceledError extends ShajaraError implements CanceledFailure {
  override readonly name = "CanceledError";
  readonly kind = "canceled" as const;

  constructor() {
    super("Canceled before completion");
  }
}
