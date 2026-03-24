import { ShajaraError } from "#/contracts";

export class ScopeFailedError extends ShajaraError {
  override readonly name = "ScopeFailedError";
}
