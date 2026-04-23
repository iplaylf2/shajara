import type { ExternalFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

export class ExternalError extends ShajaraError implements ExternalFailure {
  public constructor(
    public readonly raw: unknown,
    message: string,
  ) {
    super(message);

    if (raw instanceof Error) {
      this.cause = raw;
    }
  }

  public override readonly name = "ExternalError";
  public readonly kind = "external" as const;
}
