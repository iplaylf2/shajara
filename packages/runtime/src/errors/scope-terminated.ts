import { KhoraError } from "#src/contracts";
import { scopeTerminated } from "@shajara/kernel";

export class ScopeTerminatedError extends KhoraError {
  constructor() {
    super(scopeTerminated());
  }

  override readonly name = "ScopeTerminatedError";
}
