import type { Processor, ProcessorTask } from "./processor";
import type { Pacer } from "./pacer";
import type { ProcessRef } from "#/contracts";
import type { ProcessStep } from "#/interpreter";

export class ExecutorDriver {
  public static create(
    pacer: Pacer,
    stepProcess: <Result>(process: ProcessRef<Result>) => ProcessStep<Result>,
    beginTurn: () => void,
  ): ExecutorDriver {
    const driver = new ExecutorDriver(pacer, stepProcess, beginTurn);
    driver.#armTurn();
    return driver;
  }

  public stop(): void {
    this.#isStopped = true;
  }

  public driveSync<Result>(process: ProcessRef<Result>): ProcessStep<Result> {
    while (true) {
      const step = this.#stepProcess(process);
      switch (step.disposition) {
        case "interpreted":
        case "resonated":
          continue;
        case "ceded":
        case "waiting":
        case "exited":
          return step;
      }
    }
  }

  public get processor(): Processor {
    return this.#processor;
  }

  private constructor(
    pacer: Pacer,
    stepProcess: <Result>(process: ProcessRef<Result>) => ProcessStep<Result>,
    beginTurn: () => void,
  ) {
    this.#pacer = pacer;
    this.#stepProcess = stepProcess;
    this.#beginTurn = beginTurn;
  }

  #armTurn(): void {
    this.#pacer.continueLater(() => {
      if (this.#isStopped) {
        return;
      }

      this.#runCurrentTurn();

      if (!this.#isStopped) {
        this.#armTurn();
      }
    });
  }

  #runCurrentTurn(): void {
    const slice = this.#pacer.beginSlice();
    this.#beginTurn();

    while (this.#hasReadyTask && !slice.shouldYield()) {
      this.#driveReadyTask();
    }
  }

  #driveReadyTask(): void {
    const task = this.#ready.shift() as ProcessorTask;
    while (true) {
      const status = task.step();
      switch (status) {
        case "ready":
          continue;
        case "cede":
          this.#ready.push(task);
          return;
        case "waiting":
        case "exited":
          return;
      }
    }
  }

  get #hasReadyTask(): boolean {
    return this.#ready.length > EMPTY_QUEUE;
  }

  #isStopped = false;

  readonly #pacer: Pacer;
  readonly #stepProcess: <Result>(process: ProcessRef<Result>) => ProcessStep<Result>;
  readonly #beginTurn: () => void;
  readonly #ready: ProcessorTask[] = [];
  readonly #processor: Processor = {
    drive: (task) => {
      this.#ready.push(task);
    },
  };
}

const EMPTY_QUEUE = 0;
