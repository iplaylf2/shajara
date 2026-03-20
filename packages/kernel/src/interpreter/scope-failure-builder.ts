import type { Failure, ScopeFailure } from "#src/failures";
import type { Either } from "#src/utils";
import type { FailureShape } from "#src/contracts";
import type { RuntimeProcess } from "./runtime-process";
import { isLeft } from "#src/utils";
import { scopeFailed } from "#src/failures";

export class ScopeFailureBuilder {
  public static halted(causeProcess: RuntimeProcess, cause: Failure): ScopeFailureBuilder {
    return new ScopeFailureBuilder(causeProcess, cause);
  }

  private constructor(causeProcess: RuntimeProcess, cause: Failure) {
    this.#cause = cause;
    this.#causeProcess = causeProcess;
  }

  public get cause(): Failure {
    return this.#cause;
  }

  public get causeProcess(): RuntimeProcess {
    return this.#causeProcess;
  }

  public recordHaltHandlerResult(result: Either<FailureShape, Failure>): void {
    this.#closingFailures.push(isLeft(result) ? result.left : result.right);
  }

  public complete(cause: Failure): ScopeFailure {
    return scopeFailed(this.#causeProcess.ref, cause, this.#closingFailures);
  }

  readonly #cause: Failure;
  readonly #causeProcess: RuntimeProcess;
  readonly #closingFailures: FailureShape[] = [];
}
