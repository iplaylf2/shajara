import { ShajaraError } from "#src/contracts";

export class ScopeFailedError extends ShajaraError {
  override readonly name = "ScopeFailedError";
}
