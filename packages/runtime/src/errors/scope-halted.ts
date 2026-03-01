import { KhoraError } from "#src/contracts";
import { scopeHalted } from "@khora/kernel";

export class ScopeHaltedError extends KhoraError {
  constructor() {
    super(scopeHalted());
    this.name = "ScopeHaltedError";
  }
}
