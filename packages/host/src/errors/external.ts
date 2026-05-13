import type { ExternalFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts";

/** Error wrapper for an external failure whose raw value is not already an `Error`. */
export class ExternalError extends ShajaraError implements ExternalFailure {
  /**
   * Creates an external error wrapper.
   *
   * @param raw - External value represented by the error.
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
