import {
  DEFAULT_MAX_STEPS,
  DEFAULT_MAX_TURNS,
  EMPTY_QUEUE_LENGTH,
  NO_ENTRY_RESULT,
  createEntryCapture,
  createInterpreterRunState,
  ensureStepBudget,
  pollFutureResult,
  stepNextProcess,
  waitForResult,
} from "./runtime";
import type { EntryCapture, InterpreterRunState, SteppedProcess } from "./runtime";
import type { FutureKey, FutureResult, Interpreter, ProcessRef, Ritual, ScopeRef } from "#/index";

export interface InterpreterRun {
  readonly interpreter: Interpreter;
  readonly steps: readonly SteppedProcess[];
  readonly suppressorErrors: readonly unknown[];
  readonly trackedScopes: readonly ScopeRef<unknown>[];
}

export interface EntryExecution<Relic> extends InterpreterRun {
  readonly entryResult: Relic | null;
  readonly hasEntryResult: boolean;
  readonly status: "exhausted" | "pending";
  flush(): EntryExecution<Relic>;
  expectExhausted(): ExhaustedEntryExecution<Relic>;
  waitForExhausted(options?: ExecutionWaitOptions): Promise<ExhaustedEntryExecution<Relic>>;
  futureResult<Result>(future: FutureKey<Result>): FutureResult<Result> | null;
  processResult<Result>(process: ProcessRef<Result>): FutureResult<Result> | null;
  scopeResult<Result>(scope: ScopeRef<Result>): FutureResult<Result> | null;
  waitForFuture<Result>(
    future: FutureKey<Result>,
    options?: ExecutionWaitOptions,
  ): Promise<FutureResult<Result>>;
  waitForProcess<Result>(
    process: ProcessRef<Result>,
    options?: ExecutionWaitOptions,
  ): Promise<FutureResult<Result>>;
  waitForScope<Result>(
    scope: ScopeRef<Result>,
    options?: ExecutionWaitOptions,
  ): Promise<FutureResult<Result>>;
}

export interface ExhaustedEntryExecution<Relic> extends InterpreterRun {
  readonly entryResult: Relic;
  readonly status: "exhausted";
  flush(): ExhaustedEntryExecution<Relic>;
  futureResult<Result>(future: FutureKey<Result>): FutureResult<Result>;
  processResult<Result>(process: ProcessRef<Result>): FutureResult<Result>;
  scopeResult<Result>(scope: ScopeRef<Result>): FutureResult<Result>;
  waitForExhausted(options?: ExecutionWaitOptions): Promise<ExhaustedEntryExecution<Relic>>;
  waitForFuture<Result>(
    future: FutureKey<Result>,
    options?: ExecutionWaitOptions,
  ): Promise<FutureResult<Result>>;
  waitForProcess<Result>(
    process: ProcessRef<Result>,
    options?: ExecutionWaitOptions,
  ): Promise<FutureResult<Result>>;
  waitForScope<Result>(
    scope: ScopeRef<Result>,
    options?: ExecutionWaitOptions,
  ): Promise<FutureResult<Result>>;
}

export interface ExecutionWaitOptions {
  readonly maxTurns?: number;
}

export function executeEntry<Relic>(
  entry: Ritual<Relic>,
  maxSteps = DEFAULT_MAX_STEPS,
): EntryExecution<Relic> {
  return new HarnessExecution(entry, maxSteps);
}

class HarnessExecution<Relic> implements EntryExecution<Relic> {
  readonly #capture: EntryCapture<Relic>;
  readonly #maxSteps: number;
  readonly #run: InterpreterRunState;

  public constructor(entry: Ritual<Relic>, maxSteps: number) {
    this.#capture = createEntryCapture(entry);
    this.#maxSteps = maxSteps;
    this.#run = createInterpreterRunState(this.#capture.ritual);
    this.flush();
  }

  public get entryResult(): Relic | null {
    return this.#capture.result === NO_ENTRY_RESULT ? null : this.#capture.result;
  }

  public get hasEntryResult(): boolean {
    return this.#capture.result !== NO_ENTRY_RESULT;
  }

  public get interpreter(): Interpreter {
    return this.#run.interpreter;
  }

  public get status(): "exhausted" | "pending" {
    return this.#run.interpreter.isClosed ? "exhausted" : "pending";
  }

  public get steps(): readonly SteppedProcess[] {
    return this.#run.steps;
  }

  public get suppressorErrors(): readonly unknown[] {
    return this.#run.suppressorErrors;
  }

  public get trackedScopes(): readonly ScopeRef<unknown>[] {
    return this.#run.trackedScopes;
  }

  public flush(): EntryExecution<Relic> {
    while (this.#run.queue.length > EMPTY_QUEUE_LENGTH) {
      stepNextProcess(this.#run);
      ensureStepBudget(this.#run.steps, this.#maxSteps);
    }

    return this;
  }

  public expectExhausted(): ExhaustedEntryExecution<Relic> {
    this.flush();

    if (this.status !== "exhausted") {
      throw new Error("Expected entry to exhaust synchronously");
    }

    if (!this.hasEntryResult) {
      throw new Error("Expected exhausted entry to produce a result");
    }

    return this as ExhaustedEntryExecution<Relic>;
  }

  public waitForExhausted(options?: ExecutionWaitOptions): Promise<ExhaustedEntryExecution<Relic>> {
    return waitForResult(
      () => (this.flush().status === "exhausted" ? this.expectExhausted() : null),
      () => false,
      "Expected entry to exhaust",
      options?.maxTurns ?? DEFAULT_MAX_TURNS,
    );
  }

  public futureResult<Result>(future: FutureKey<Result>): FutureResult<Result> | null {
    this.flush();
    return pollFutureResult(this.#run.interpreter, future);
  }

  public processResult<Result>(process: ProcessRef<Result>): FutureResult<Result> | null {
    return this.futureResult(process.exitFuture);
  }

  public scopeResult<Result>(scope: ScopeRef<Result>): FutureResult<Result> | null {
    return this.futureResult(scope.exitFuture);
  }

  public waitForFuture<Result>(
    future: FutureKey<Result>,
    options?: ExecutionWaitOptions,
  ): Promise<FutureResult<Result>> {
    return waitForResult(
      () => this.futureResult(future),
      () => this.status === "exhausted",
      "Expected future to settle before execution exhausted",
      options?.maxTurns ?? DEFAULT_MAX_TURNS,
    );
  }

  public waitForProcess<Result>(
    process: ProcessRef<Result>,
    options?: ExecutionWaitOptions,
  ): Promise<FutureResult<Result>> {
    return this.waitForFuture(process.exitFuture, options);
  }

  public waitForScope<Result>(
    scope: ScopeRef<Result>,
    options?: ExecutionWaitOptions,
  ): Promise<FutureResult<Result>> {
    return this.waitForFuture(scope.exitFuture, options);
  }
}
