import { ShajaraError } from "#src/contracts";
import { scopeHalted } from "@shajara/kernel";

export class ScopeHaltedError extends ShajaraError {
  constructor() {
    super(scopeHalted());
  }

  override readonly name = "ScopeHaltedError";
}
