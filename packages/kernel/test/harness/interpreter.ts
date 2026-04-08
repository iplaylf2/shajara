import type { ProcessRef, Ritual, Suppressor } from "#/contracts";
import { Interpreter } from "#/interpreter";
import type { ProcessStep } from "#/interpreter";
import { restingWisp } from "#/contracts";

export function interpretRitual<Relic>(ritual: Ritual<Relic>, maxSteps = DEFAULT_MAX_STEPS) {
  return new RitualInterpreter(ritual, maxSteps);
}

class RitualInterpreter<Relic> {
  readonly #entryProcess: ProcessRef<Relic>;
  readonly #interpreter: Interpreter;
  readonly #maxSteps: number;
  readonly #queue: ProcessRef<unknown>[] = [];
  readonly #suppressorErrors: unknown[] = [];
  #stepCount = STEP_COUNT_START;
  #stepLast: ProcessStep<Relic> | null = null;

  public constructor(ritual: Ritual<Relic>, maxSteps: number) {
    this.#maxSteps = maxSteps;
    this.#interpreter = new Interpreter(() => restingWisp(VOID_RESULT), {
      trackProcess: (process: ProcessRef<unknown>) => {
        this.#queue.push(process);
      },
      trackScope() {
        // Harness only needs runnable processes for primitive tests.
      },
    });
    this.#entryProcess = this.#interpreter.spawn(
      this.#interpreter.scopeRoot,
      ritual,
      this.#createSuppressor(),
    );
  }

  public get suppressorErrors(): readonly unknown[] {
    return this.#suppressorErrors;
  }

  public driveSync(): ProcessStep<Relic> {
    while (this.#queue.length > QUEUE_EMPTY_LENGTH) {
      const process = this.#queue.shift() ?? failStalledInterpreter();
      const step = this.#driveProcessSync(process);

      if (process === this.#entryProcess) {
        this.#stepLast = step as ProcessStep<Relic>;
      }

      this.#requeueRunningProcess(process);
    }

    return this.#stepLast ?? failEntryNeverStepped();
  }

  public waitForExit(options?: WaitForExitOptions): Promise<ProcessStep<Relic>> {
    return this.#waitForExit(options?.maxTurns ?? DEFAULT_MAX_TURNS);
  }

  #createSuppressor(): Suppressor {
    return {
      capture: (error) => {
        this.#suppressorErrors.push(error);
      },
    };
  }

  #driveProcessSync(process: ProcessRef<unknown>): ProcessStep<Relic> {
    while (true) {
      if (this.#interpreter.processState(process).status === "closed") {
        return this.#interpreter.step(process, this.#createSuppressor()) as ProcessStep<Relic>;
      }

      const step = this.#interpreter.step(process, this.#createSuppressor());
      this.#stepCount += STEP_INCREMENT;

      if (this.#stepCount > this.#maxSteps) {
        throw new Error(`Interpreter exceeded ${this.#maxSteps} steps`);
      }

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

  #requeueRunningProcess(process: ProcessRef<unknown>): void {
    const state = this.#interpreter.processState(process);

    if (state.status === "open" && state.activity === "running") {
      this.#queue.push(process);
    }
  }

  #waitForExit(maxTurns: number): Promise<ProcessStep<Relic>> {
    const driver = this;

    return waitForTurn(TURN_START);

    async function waitForTurn(turn: number): Promise<ProcessStep<Relic>> {
      const step = driver.driveSync();

      if (step.disposition === "exited") {
        return step;
      }

      if (turn >= maxTurns) {
        throw new Error(`Timed out after ${maxTurns} turns`);
      }

      await new Promise<void>((resolve) => {
        globalThis.setTimeout(resolve, PAUSE_DELAY_MS);
      });

      return waitForTurn(turn + STEP_INCREMENT);
    }
  }
}

interface WaitForExitOptions {
  readonly maxTurns?: number;
}

function failEntryNeverStepped(): never {
  throw new Error("Expected entry process to be stepped");
}

function failStalledInterpreter(): never {
  throw new Error("Interpreter stalled without a runnable process");
}

function voidResult(): void {
  // Intentionally empty to produce a void value without spelling `undefined`.
}

const DEFAULT_MAX_STEPS = 100;
const DEFAULT_MAX_TURNS = 10;
const PAUSE_DELAY_MS = 0;
const QUEUE_EMPTY_LENGTH = 0;
const STEP_COUNT_START = 0;
const STEP_INCREMENT = 1;
const TURN_START = 0;
const VOID_RESULT = voidResult();
