import { ShajaraError } from "#/contracts";
import { canceled } from "@shajara/kernel";

export class CanceledError extends ShajaraError {
  constructor() {
    super(canceled());
  }

  override readonly name = "CanceledError";
}
