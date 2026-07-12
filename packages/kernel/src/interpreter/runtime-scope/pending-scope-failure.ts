import type { Failure, ScopeFailure } from "#/failures/index.js";
import { scopeFailure } from "#/failures/index.js";

export class PendingScopeFailure {
  public constructor(private readonly failure: Failure) {}

  public suppress(failure: Failure): void {
    this.#suppressed.push(failure);
  }

  public build(): ScopeFailure {
    return scopeFailure(this.failure, this.#suppressed);
  }

  readonly #suppressed: Failure[] = [];
}
