import type { Processor, ProcessorTask, ProcessorTaskStatus, Suppressor } from "#/index";

export function createInlineProcessor(taskStatuses: ProcessorTaskStatus[] = []): Processor {
  return {
    admit: (task) => {
      consumeTask(task, taskStatuses);
    },
  };
}

export function createManagedQueuedProcessor(
  taskStatuses: ProcessorTaskStatus[] = [],
): ManagedQueuedProcessorHandle {
  return new ManagedQueuedProcessor(taskStatuses);
}

export interface ManagedQueuedProcessorHandle extends AsyncDisposable {
  readonly processor: Processor;
}

class ManagedQueuedProcessor implements ManagedQueuedProcessorHandle {
  public constructor(private readonly taskStatuses: ProcessorTaskStatus[]) {}

  public async [Symbol.asyncDispose](): Promise<void> {
    this.#isRunning = false;
    await this.#waitForQuiescence(0);
  }

  public get processor(): Processor {
    return this.#processor;
  }

  #armTurn(): void {
    if (this.#turnScheduled || !this.#isRunning) {
      return;
    }

    this.#turnScheduled = true;
    this.#pendingTurns += 1;
    globalThis.setTimeout(() => {
      try {
        this.#turnScheduled = false;
        if (this.#isRunning) {
          this.#runCurrentTurn();
        }
      } finally {
        this.#pendingTurns -= 1;
      }
    }, TURN_DELAY_MS);
  }

  #runCurrentTurn(): void {
    while (this.#tasks.length > 0) {
      const task = this.#tasks.shift()!;
      const status = consumeTask(task, this.taskStatuses);
      if (status === "cede") {
        this.#tasks.push(task);
      }
    }

    if (this.#tasks.length > 0) {
      this.#armTurn();
    }
  }

  async #waitForQuiescence(turn: number): Promise<void> {
    if (this.#pendingTurns === 0) {
      return;
    }

    if (turn >= MAX_QUIESCENCE_TURNS) {
      throw new Error(`Timed out after ${MAX_QUIESCENCE_TURNS} turns`);
    }

    await new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, TURN_DELAY_MS);
    });

    return this.#waitForQuiescence(turn + 1);
  }
  #isRunning = true;
  #pendingTurns = 0;
  readonly #tasks: ProcessorTask[] = [];
  #turnScheduled = false;
  readonly #processor: Processor = {
    admit: (task) => {
      this.#tasks.push(task);
      this.#armTurn();
    },
  };
}

function consumeTask(
  task: ProcessorTask,
  taskStatuses: ProcessorTaskStatus[],
): ProcessorTaskStatus {
  while (true) {
    const status = task.step(throwingSuppressor);
    taskStatuses.push(status);
    if (status !== "ready") {
      return status;
    }
  }
}

const throwingSuppressor: Suppressor = {
  capture: (error) => {
    throw error;
  },
};

const MAX_QUIESCENCE_TURNS = 10;
const TURN_DELAY_MS = 0;
