import type { FutureKey, FutureResult, ProcessRef, Ritual, Suppressor } from "#/contracts";
import { Interpreter } from "#/interpreter";
import type { ProcessStep } from "#/interpreter";
import { iife } from "#/utils";
import { option } from "fp-ts";
import { restingWisp } from "#/contracts";

export function interpretRitual<Relic>(ritual: Ritual<Relic>) {
  return new RitualInterpreter(ritual);
}

class RitualInterpreter<Relic> implements AsyncDisposable {
  public constructor(ritual: Ritual<Relic>) {
    this.#interpreter = new Interpreter(() => restingWisp(VOID), {
      trackProcess: (process: ProcessRef<unknown>) => {
        this.#queueNext.delete(process);
        this.#queueCurrent.add(process);
      },
      trackScope() {
        // Harness only needs runnable processes for primitive tests.
      },
    });
    this.#entryProcess = this.#interpreter.spawn(
      this.#interpreter.scopeRoot,
      ritual,
      this.#suppressor,
    );
  }

  public driveSync(): ProcessStep<Relic> {
    this.#beginTurn();

    while (this.#queueCurrent.size > 0) {
      const process = this.#takeCurrentProcess() ?? failStalledInterpreter();
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

  public waitForClosed(options?: WaitOptions): Promise<ProcessStep<Relic>> {
    return this.#waitFor(() => {
      if (!this.#interpreter.isClosed) {
        return null;
      }

      const step = this.#stepLast;
      if (!step || step.disposition !== "exited") {
        throw new Error("Expected entry process to exit before interpreter closed");
      }

      return step;
    }, options?.maxTurns ?? DEFAULT_MAX_TURNS);
  }

  public waitForFuture<Result>(
    futureKey: FutureKey<Result>,
    options?: WaitOptions,
  ): Promise<FutureResult<Result>> {
    return this.#waitFor(() => {
      const polled = this.#interpreter.poll(futureKey);
      if (option.isSome(polled)) {
        return polled.value as FutureResult<Result>;
      }

      if (this.#interpreter.isClosed) {
        throw new Error("Expected future to settle before interpreter closed");
      }

      return null;
    }, options?.maxTurns ?? DEFAULT_MAX_TURNS);
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
      if (this.#interpreter.processState(process).status === "closed") {
        return this.#interpreter.step(process, this.#suppressor) as ProcessStep<Relic>;
      }

      const step = this.#interpreter.step(process, this.#suppressor);

      switch (step.disposition) {
        case "interpreted":
        case "resonated":
          continue;
        case "ceded":
        case "waiting":
        case "exited":
          return step as ProcessStep<Relic>;
      }
    }
  }

  #takeCurrentProcess(): ProcessRef<unknown> | undefined {
    const current = this.#queueCurrent.values().next();
    if (current.done) {
      return undefined;
    }

    this.#queueCurrent.delete(current.value);
    return current.value;
  }

  #beginTurn(): void {
    if (this.#queueCurrent.size === 0 && this.#queueNext.size > 0) {
      const current = this.#queueCurrent;
      this.#queueCurrent = this.#queueNext;
      this.#queueNext = current;
      this.#queueNext.clear();
    }
  }

  #waitFor<Result>(observe: () => Result | null, maxTurns: number): Promise<Result> {
    const driver = this;

    return waitForTurn(0);

    async function waitForTurn(turn: number): Promise<Result> {
      const observed = observe();
      if (observed !== null) {
        return observed;
      }

      driver.driveSync();

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
    }
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

interface WaitOptions {
  readonly maxTurns?: number;
}

function failEntryNeverStepped(): never {
  throw new Error("Expected entry process to be stepped");
}

function failStalledInterpreter(): never {
  throw new Error("Interpreter stalled without a runnable process");
}

const DEFAULT_MAX_TURNS = 10;
const DEFAULT_DISPOSE_MAX_TURNS = 10;
const PAUSE_DELAY_MS = 0;
const VOID = iife(() => {
  // Produce a void value
});
