import { KhoraError } from "#src/contracts";
import { externalFailure } from "@khora/kernel";

export class ExternalError extends KhoraError {
  constructor(raw: unknown, message: string) {
    super(externalFailure(raw, () => message));

    if (raw instanceof Error) {
      this.cause = raw;
    }
  }

  override readonly name = "ExternalError";
}
