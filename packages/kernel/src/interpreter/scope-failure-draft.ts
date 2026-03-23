import type { Failure, ProcessCause, ScopeCause, ScopeFailure } from "#src/failures";
import { scopeFailed } from "#src/failures";

export class ScopeFailureDraft {
  public constructor(cause: FailureCauseSeed, resolveFailure: () => Failure) {
    this.#cause = cause;
    this.#resolveFailure = resolveFailure;
  }

  public suppress(failure: Failure): void {
    this.#suppressedFailures.push(failure);
  }

  public build(): ScopeFailure {
    return scopeFailed(
      {
        ...this.#cause,
        failure: this.#resolveFailure(),
      },
      this.#suppressedFailures,
    );
  }

  readonly #cause: FailureCauseSeed;
  readonly #resolveFailure: () => Failure;
  readonly #suppressedFailures: Failure[] = [];
}

type FailureCauseSeed = Omit<ProcessCause, "failure"> | Omit<ScopeCause, "failure">;
