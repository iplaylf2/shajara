import type { ExternalFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

export class ExternalError extends ShajaraError implements ExternalFailure {
  override readonly name = "ExternalError";
  readonly kind = "external" as const;

  constructor(
    readonly raw: unknown,
    message: string,
  ) {
    super(message);

    if (raw instanceof Error) {
      this.cause = raw;
    }
  }
}
