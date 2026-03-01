import { KhoraError } from "#src/contracts";
import { externalFailure } from "@khora/kernel";

export class ExternalError extends KhoraError {
  constructor(message: string = "External failure") {
    super(externalFailure(() => message));
    this.name = "ExternalError";
  }
}
