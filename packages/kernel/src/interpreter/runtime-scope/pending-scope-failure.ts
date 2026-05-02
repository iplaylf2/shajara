import type { Failure, ScopeFailure } from "#/failures";
import { scopeFailure } from "#/failures";

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
