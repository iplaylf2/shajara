import type { Failure, ScopeFailure, ScopeFailureCause } from "#src/failures";
import type { ProcessRef, ScopeRef } from "#src/contracts";
import { scopeFailed } from "#src/failures";

export class ScopeFailureBuilder {
  public static fromProcess(process: ProcessRef<unknown>, failure: Failure): ScopeFailureBuilder {
    return new ScopeFailureBuilder({
      failure,
      kind: "process",
      process,
    });
  }

  public static fromScope(scope: ScopeRef<unknown>, failure: Failure): ScopeFailureBuilder {
    return new ScopeFailureBuilder({
      failure,
      kind: "scope",
      scope,
    });
  }

  private constructor(cause: ScopeFailureCause) {
    this.#cause = cause;
  }

  public get cause(): ScopeFailureCause {
    return this.#cause;
  }

  public suppress(failure: Failure): void {
    this.#suppressedFailures.push(failure);
  }

  public build(): ScopeFailure {
    return scopeFailed(this.#cause, this.#suppressedFailures);
  }

  readonly #cause: ScopeFailureCause;
  readonly #suppressedFailures: Failure[] = [];
}
