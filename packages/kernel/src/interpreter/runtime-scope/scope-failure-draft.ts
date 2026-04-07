import type { Failure, ProcessCause, ScopeCause, ScopeFailure } from "#/failures";
import { scopeFailure } from "#/failures";

export class ScopeFailureDraft {
  public constructor(
    private readonly cause: FailureCause,
    private readonly resolveFailure: () => Failure,
  ) {}

  public capture(failure: Failure): void {
    this.#suppressed.push(failure);
  }

  public build(): ScopeFailure {
    return scopeFailure(
      {
        ...this.cause,
        failure: this.resolveFailure(),
      },
      this.#suppressed,
    );
  }

  readonly #suppressed: Failure[] = [];
}

type FailureCause = Omit<ProcessCause, "failure"> | Omit<ScopeCause, "failure">;
