import { KhoraError } from "#src/contracts";
import { scopeTerminated } from "@khora/kernel";

export class ScopeTerminatedError extends KhoraError {
  constructor() {
    super(scopeTerminated());
    this.name = "ScopeTerminatedError";
  }
}
