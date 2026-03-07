import { ShajaraError } from "#src/contracts";
import { scopeTerminated } from "@shajara/kernel";

export class ScopeTerminatedError extends ShajaraError {
  constructor() {
    super(scopeTerminated());
  }

  override readonly name = "ScopeTerminatedError";
}
