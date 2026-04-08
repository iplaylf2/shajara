import type {
  FutureKey,
  FutureResult,
  ProcessRef,
  ProcessStep,
  Ritual,
  ScopeRef,
  ScopeZone,
  Suppressor,
  Wisp,
} from "#/index";
import { Interpreter } from "#/index";

export const DEFAULT_MAX_STEPS = 100;
export const DEFAULT_MAX_TURNS = 10;
export const EMPTY_QUEUE_LENGTH = 0;
export const NO_ENTRY_RESULT = Symbol("no-entry-result");

const PAUSE_DELAY_MS = 0;
const TURN_START = 0;
const TURN_STEP = 1;
const VOID_RESULT = createVoidResult();

export interface SteppedProcess {
  readonly process: ProcessRef<unknown>;
  readonly step: ProcessStep<unknown>;
}

export interface EntryCapture<Relic> {
  result: Relic | typeof NO_ENTRY_RESULT;
  ritual: Ritual<void>;
}

export interface InterpreterRunState {
  readonly interpreter: Interpreter;
  queue: ProcessRef<unknown>[];
  steps: SteppedProcess[];
  suppressorErrors: unknown[];
  trackedScopes: ScopeRef<unknown>[];
}

export function ensureStepBudget(steps: readonly SteppedProcess[], maxSteps: number): void {
  if (steps.length > maxSteps) {
    throw new Error(`Interpreter exceeded ${maxSteps} steps`);
  }
}

export function createEntryCapture<Relic>(entry: Ritual<Relic>): EntryCapture<Relic> {
  const capture: EntryCapture<Relic> = {
    result: NO_ENTRY_RESULT,
    ritual: () =>
      captureWispResult(entry(), (value) => {
        capture.result = value;
      }),
  };

  return capture;
}

export function createInterpreterRunState(entry: Ritual<void>): InterpreterRunState {
  const run = {
    queue: [],
    steps: [],
    suppressorErrors: [],
    trackedScopes: [],
  } as Omit<InterpreterRunState, "interpreter">;

  return {
    ...run,
    interpreter: new Interpreter(entry, createScopeZone(run as InterpreterRunState)),
  };
}

export function stepNextProcess(run: InterpreterRunState): void {
  const process = takeRunnableProcess(run.queue);
  const { interpreter } = run;

  if (interpreter.processState(process).status === "closed") {
    return;
  }

  const step = interpreter.step(process, createSuppressor(run));
  run.steps.push({ process, step });

  const state = interpreter.processState(process);

  if (state.status === "open" && state.activity === "running") {
    run.queue.push(process);
  }
}

export function pollFutureResult<Result>(
  interpreter: Interpreter,
  future: FutureKey<Result>,
): FutureResult<Result> | null {
  const result = interpreter.poll(future);
  return result._tag === "None" ? null : result.value;
}

export function waitForResult<Result>(
  readResult: () => Result | null,
  isExhausted: () => boolean,
  failureMessage: string,
  maxTurns = DEFAULT_MAX_TURNS,
): Promise<Result> {
  return waitForTurn(TURN_START);

  function waitForTurn(turn: number): Promise<Result> {
    const result = readResult();

    if (result !== null) {
      return Promise.resolve(result);
    }

    if (isExhausted()) {
      return Promise.reject(new Error(failureMessage));
    }

    if (turn >= maxTurns) {
      return Promise.reject(new Error(`Timed out after ${maxTurns} turns`));
    }

    return pauseTurn().then(() => waitForTurn(turn + TURN_STEP));
  }
}

function createScopeZone(run: InterpreterRunState): ScopeZone {
  return {
    trackProcess(process) {
      run.queue.push(process);
    },
    trackScope(scope) {
      run.trackedScopes.push(scope);
    },
  };
}

function createSuppressor(run: InterpreterRunState): Suppressor {
  return {
    capture(error) {
      run.suppressorErrors.push(error);
    },
  };
}

function takeRunnableProcess(queue: ProcessRef<unknown>[]): ProcessRef<unknown> {
  return queue.shift() ?? failNoRunnableProcess();
}

function failNoRunnableProcess(): never {
  throw new Error("Interpreter stalled without a runnable process");
}

function pauseTurn(): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, PAUSE_DELAY_MS);
  });
}

function createVoidResult(): void {
  // Intentionally empty to produce a void value without spelling `undefined`.
}

function captureWispResult<Relic>(wisp: Wisp<Relic>, onResult: (value: Relic) => void): Wisp<void> {
  if (wisp.bearing === "resting") {
    onResult(wisp.relic);
    return {
      bearing: "resting",
      relic: VOID_RESULT,
    };
  }

  return {
    bearing: "stirring",
    resonate: (echo) => captureWispResult(wisp.resonate(echo), onResult),
    sigil: wisp.sigil,
  };
}
