import type { Processor, ProcessorTask } from "./processor";
import { FaultSink } from "./fault-sink";
import type { Pacer } from "./pacer";
import type { ProcessRef } from "#/contracts";
import type { ProcessStep } from "#/interpreter";
import { readonlyArray } from "fp-ts";

export class ExecutorDriver {
  public static create(pacer: Pacer, loop: ExecutorDriverLoop): ExecutorDriver {
    const driver = new ExecutorDriver(pacer, loop);
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

  private constructor(pacer: Pacer, loop: ExecutorDriverLoop) {
    this.#pacer = pacer;
    this.#loop = loop;
  }

  #armTurn(): void {
    this.#pacer.continueLater(() => {
      if (this.#isStopped) {
        return;
      }

      try {
        this.#runCurrentTurn();
      } finally {
        if (!this.#isStopped) {
          this.#armTurn();
        }
      }
    });
  }

  #runCurrentTurn(): void {
    const slice = this.#pacer.beginSlice();
    this.#loop.beginTurn();

    while (this.#hasTask && !slice.shouldYield()) {
      this.#driveTask();
    }
  }

  #driveTask(): void {
    const [task] = this.#tasks;
    while (true) {
      using faultSink = new FaultSink("Out-of-band failures occurred while driving executor work");
      const status = task!.step(faultSink);

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
  readonly #loop: ExecutorDriverLoop;
  readonly #tasks: ProcessorTask[] = [];
  readonly #processor: Processor = {
    drive: (task) => {
      this.#tasks.push(task);
    },
  };

  #stepProcess<Result>(process: ProcessRef<Result>): ProcessStep<Result> {
    return this.#loop.stepProcess(process);
  }
}

export interface ExecutorDriverLoop {
  beginTurn(): void;
  stepProcess<Result>(process: ProcessRef<Result>): ProcessStep<Result>;
}
