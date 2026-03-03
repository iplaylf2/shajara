import { KhoraError } from "#src/contracts";
import { externalFailure } from "@khora/kernel";

export class ExternalError extends KhoraError {
  constructor(raw: unknown, message: string) {
    super(externalFailure(raw, () => message));
    this.name = "ExternalError";

    if (raw instanceof Error) {
      this.cause = raw;
    }
  }
}
