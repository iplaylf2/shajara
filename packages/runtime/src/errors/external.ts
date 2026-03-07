import { ShajaraError } from "#src/contracts";
import { externalFailure } from "@shajara/kernel";

export class ExternalError extends ShajaraError {
  constructor(raw: unknown, message: string) {
    super(externalFailure(raw, () => message));

    if (raw instanceof Error) {
      this.cause = raw;
    }
  }

  override readonly name = "ExternalError";
}
