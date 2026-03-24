import { ShajaraError } from "#/contracts";
import { canceledFailure } from "@shajara/kernel";

export class CanceledError extends ShajaraError {
  constructor() {
    super(canceledFailure());
  }

  override readonly name = "CanceledError";
}
