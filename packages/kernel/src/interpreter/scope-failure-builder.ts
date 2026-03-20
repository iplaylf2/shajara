import type { Failure, ScopeFailure } from "#src/failures";
import type { ProcessRef } from "#src/contracts";
import { scopeFailed } from "#src/failures";

export class ScopeFailureBuilder {
  public static create(causeProcess: ProcessRef<unknown>, cause: Failure): ScopeFailureBuilder {
    return new ScopeFailureBuilder(causeProcess, cause);
  }

  private constructor(causeProcess: ProcessRef<unknown>, cause: Failure) {
    this.#cause = cause;
    this.#causeProcess = causeProcess;
  }

  public get cause(): Failure {
    return this.#cause;
  }

  public get causeProcess(): ProcessRef<unknown> {
    return this.#causeProcess;
  }

  public addClosingFailure(failure: Failure): void {
    this.#closingFailures.push(failure);
  }

  public build(): ScopeFailure {
    return scopeFailed(this.#causeProcess, this.#cause, this.#closingFailures);
  }

  readonly #cause: Failure;
  readonly #causeProcess: ProcessRef<unknown>;
  readonly #closingFailures: Failure[] = [];
}
