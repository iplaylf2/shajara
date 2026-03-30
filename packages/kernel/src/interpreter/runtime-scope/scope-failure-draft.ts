import type { Failure, ProcessCause, ScopeCause, ScopeFailure } from "#/failures";
import { scopeFailure } from "#/failures";

export class ScopeFailureDraft {
  public constructor(
    private readonly cause: FailureCause,
    private readonly resolveFailure: () => Failure,
  ) {}

  public collect(failure: Failure): void {
    this.#suppressedFailures.push(failure);
  }

  public build(): ScopeFailure {
    return scopeFailure(
      {
        ...this.cause,
        failure: this.resolveFailure(),
      },
      this.#suppressedFailures,
    );
  }

  readonly #suppressedFailures: Failure[] = [];
}

type FailureCause = Omit<ProcessCause, "failure"> | Omit<ScopeCause, "failure">;
