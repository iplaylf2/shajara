import type { Processor, ProcessorTask } from "./processor";
import { FaultSink } from "./fault-sink";
import type { Pacer } from "./pacer";
import type { ProcessRef } from "#/contracts";
import type { ProcessStep } from "#/interpreter";
import { readonlyArray } from "fp-ts";

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

  public driveSyncUnsafely<Result>(process: ProcessRef<Result>): ProcessStep<Result> {
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

    while (this.#hasTask && !slice.shouldYield()) {
      this.#driveTask();
    }
  }

  #driveTask(): void {
    const [task] = this.#tasks;
    while (true) {
      const faultSink = new FaultSink();
      const status = task!.step(faultSink);
      faultSink.throwIfAny("Out-of-band failures occurred while driving executor work");

      switch (status) {
        case "ready":
          continue;
        case "cede":
          this.#tasks.shift();
          this.#tasks.push(task!);
          return;
        case "waiting":
        case "exited":
          this.#tasks.shift();
          return;
      }
    }
  }

  get #hasTask(): boolean {
    return readonlyArray.isNonEmpty(this.#tasks);
  }

  #isStopped = false;
  readonly #pacer: Pacer;
  readonly #stepProcess: <Result>(process: ProcessRef<Result>) => ProcessStep<Result>;
  readonly #beginTurn: () => void;
  readonly #tasks: ProcessorTask[] = [];
  readonly #processor: Processor = {
    drive: (task) => {
      this.#tasks.push(task);
    },
  };
}
