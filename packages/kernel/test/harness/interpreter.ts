import type { FutureKey, FutureResult, ProcessRef, Ritual, Suppressor } from "#/contracts";
import { Interpreter } from "#/interpreter";
import type { ProcessStep } from "#/interpreter";
import { option } from "fp-ts";

export function interpretRitual<Relic>(ritual: Ritual<Relic>): RitualInterpreterHandle<Relic> {
  return new RitualInterpreter(ritual);
}

export interface RitualInterpreterHandle<Relic> extends AsyncDisposable {
  driveSync(): ProcessStep<Relic>;
  waitForClosed(options?: WaitOptions): Promise<ProcessStep<Relic>>;
  waitForFuture<Result>(
    futureKey: FutureKey<Result>,
    options?: WaitOptions,
  ): Promise<FutureResult<Result>>;
  readonly suppressorErrors: readonly unknown[];
}

export interface WaitOptions {
  readonly maxTurns?: number;
}

class RitualInterpreter<Relic> implements RitualInterpreterHandle<Relic> {
  public constructor(ritual: Ritual<Relic>) {
    this.#interpreter = Interpreter.create(ritual, {
      trackProcess: (process: ProcessRef<unknown>) => {
        this.#queueNext.delete(process);
        this.#queueCurrent.add(process);
      },
      trackScope() {
        // Harness only needs runnable processes for primitive tests.
      },
    });
    this.#entryProcess = this.#interpreter.processRoot as ProcessRef<Relic>;
  }

  public driveSync(): ProcessStep<Relic> {
    this.#beginTurn();

    while (this.#queueCurrent.size > 0) {
      const current = this.#queueCurrent.values().next();
      const process = current.value!;
      this.#queueCurrent.delete(process);
      const state = this.#interpreter.processState(process);

      if (state.status === "closed") {
        if (process === this.#entryProcess) {
          this.#stepLast = this.#interpreter.step(process, this.#suppressor) as ProcessStep<Relic>;
        }
        continue;
      }

      if (state.activity === "waiting") {
        continue;
      }

      const step = this.#driveProcessSync(process);

      if (process === this.#entryProcess) {
        this.#stepLast = step as ProcessStep<Relic>;
      }

      if (step.disposition === "ceded") {
        this.#queueNext.add(process);
      }
    }

    return this.#stepLast ?? failEntryNeverStepped();
  }

  public async waitForClosed(options?: WaitOptions): Promise<ProcessStep<Relic>> {
    await this.#waitForFutureSettlement(
      this.#interpreter.scopeRoot.exitFuture,
      options?.maxTurns ?? DEFAULT_MAX_TURNS,
    );

    const step = this.#interpreter.step(this.#entryProcess, this.#suppressor) as ProcessStep<Relic>;
    this.#stepLast = step;
    if (step.disposition !== "exited") {
      throw new Error("Expected entry process to exit before interpreter closed");
    }

    return step;
  }

  public waitForFuture<Result>(
    futureKey: FutureKey<Result>,
    options?: WaitOptions,
  ): Promise<FutureResult<Result>> {
    return this.#waitForFutureSettlement(futureKey, options?.maxTurns ?? DEFAULT_MAX_TURNS);
  }

  public async [Symbol.asyncDispose](): Promise<void> {
    const existing = this.#disposePromise;
    if (existing) {
      await existing;
      return;
    }

    const dispose = this.#dispose();
    this.#disposePromise = dispose;
    await dispose;
  }

  public get suppressorErrors(): readonly unknown[] {
    return this.#suppressorErrors;
  }

  #driveProcessSync(process: ProcessRef<unknown>): ProcessStep<Relic> {
    while (true) {
      const step = this.#interpreter.step(process, this.#suppressor);

      switch (step.disposition) {
        case "interpreted":
        case "resonated": {
          continue;
        }
        case "ceded":
        case "waiting":
        case "exited": {
          return step as ProcessStep<Relic>;
        }
      }
    }
  }

  #beginTurn(): void {
    if (this.#queueCurrent.size === 0 && this.#queueNext.size > 0) {
      const current = this.#queueCurrent;
      this.#queueCurrent = this.#queueNext;
      this.#queueNext = current;
      this.#queueNext.clear();
    }
  }

  async #waitForFutureSettlement<Result>(
    futureKey: FutureKey<Result>,
    maxTurns: number,
  ): Promise<FutureResult<Result>> {
    const settled = this.#interpreter.poll(futureKey);
    if (option.isSome(settled)) {
      return settled.value as FutureResult<Result>;
    }

    let result: FutureResult<Result> | null = null;
    const dispose = this.#interpreter.onSettled(futureKey, (nextResult) => {
      result = nextResult as FutureResult<Result>;
    });

    try {
      return await this.#waitFor(() => result, maxTurns);
    } finally {
      dispose();
    }
  }

  #waitFor<Result>(observe: () => Result | null, maxTurns: number): Promise<Result> {
    const waitForTurn = async (turn: number): Promise<Result> => {
      const observed = observe();
      if (observed !== null) {
        return observed;
      }

      this.driveSync();

      const observedAfterTurn = observe();
      if (observedAfterTurn !== null) {
        return observedAfterTurn;
      }

      if (turn >= maxTurns) {
        throw new Error(`Timed out after ${maxTurns} turns`);
      }

      await new Promise<void>((resolve) => {
        globalThis.setTimeout(resolve, PAUSE_DELAY_MS);
      });

      return waitForTurn(turn + 1);
    };

    return waitForTurn(0);
  }

  async #dispose(): Promise<void> {
    if (this.#interpreter.isClosed) {
      return;
    }

    await this.waitForClosed({ maxTurns: DEFAULT_DISPOSE_MAX_TURNS });
  }

  #queueCurrent = new Set<ProcessRef<unknown>>();
  #queueNext = new Set<ProcessRef<unknown>>();
  #stepLast: ProcessStep<Relic> | null = null;
  #disposePromise: Promise<void> | null = null;

  readonly #entryProcess: ProcessRef<Relic>;
  readonly #interpreter: Interpreter;
  readonly #suppressorErrors: unknown[] = [];
  readonly #suppressor: Suppressor = {
    capture: (error) => {
      this.#suppressorErrors.push(error);
    },
  };
}

function failEntryNeverStepped(): never {
  throw new Error("Expected entry process to be stepped");
}

const DEFAULT_MAX_TURNS = 10;
const DEFAULT_DISPOSE_MAX_TURNS = 10;
const PAUSE_DELAY_MS = 0;
