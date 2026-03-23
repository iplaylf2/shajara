import { ShajaraError } from "#src/contracts";
import { canceled } from "@shajara/kernel";

export class CanceledError extends ShajaraError {
  constructor() {
    super(canceled());
  }

  override readonly name = "CanceledError";
}
