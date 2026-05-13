import type { ExternalFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

/** Error wrapper for a value represented as an external shajara failure. */
export class ExternalError extends ShajaraError implements ExternalFailure {
  /**
   * Creates an external error wrapper.
   *
   * @param raw - Original external value.
   * @param message - Error message.
   */
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
