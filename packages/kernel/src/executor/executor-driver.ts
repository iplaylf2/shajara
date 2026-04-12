import type { Processor, ProcessorTask } from "./processor";
import { FaultSink } from "./fault-sink";
import type { Pacer } from "./pacer";
import type { ProcessRef } from "#/contracts";
import type { ProcessStep } from "#/interpreter";
import { readonlyArray } from "fp-ts";

export class ExecutorDriver {
  public stop(): void {
    this.#isStopped = true;
  }

  public driveSyncUnsafely<Result>(process: ProcessRef<Result>): ProcessStep<Result> {
    while (true) {
      const step = this.#stepProcess(process);
      switch (step.disposition) {
        case "interpreted":
        case "resonated": {
          continue;
        }
        case "ceded":
        case "waiting":
        case "exited": {
          return step;
        }
      }
    }
  }

  public constructor(
    pacer: Pacer,
    stepProcess: <Result>(process: ProcessRef<Result>) => ProcessStep<Result>,
  ) {
    this.#pacer = pacer;
    this.#stepProcess = stepProcess;
  }

  public get processor(): Processor {
    return this.#processor;
  }

  #ensureTurnArmed(): void {
    if (this.#isStopped || this.#isTurnArmed || !this.#hasTask) {
      return;
    }

    this.#isTurnArmed = true;
    this.#pacer.continueLater(() => {
      if (this.#isStopped) {
        this.#isTurnArmed = false;
        return;
      }

      try {
        this.#runCurrentTurn();
      } finally {
        this.#isTurnArmed = false;
        this.#ensureTurnArmed();
      }
    });
  }

  #runCurrentTurn(): void {
    const slice = this.#pacer.beginSlice();

    while (this.#hasTask && !slice.shouldYield()) {
      this.#consumeTask();
    }
  }

  #consumeTask(): void {
    const [task] = this.#tasks;
    while (true) {
      using faultSink = new FaultSink(
        "Out-of-band failures occurred while processing executor work",
      );
      const status = task!.step(faultSink);

      switch (status) {
        case "ready": {
          continue;
        }
        case "cede": {
          this.#tasks.shift();
          this.#tasks.push(task!);
          return;
        }
        case "waiting":
        case "exited": {
          this.#tasks.shift();
          return;
        }
      }
    }
  }

  get #hasTask(): boolean {
    return readonlyArray.isNonEmpty(this.#tasks);
  }

  #isStopped = false;
  #isTurnArmed = false;
  readonly #pacer: Pacer;
  readonly #tasks: ProcessorTask[] = [];
  readonly #processor: Processor = {
    admit: (task) => {
      this.#tasks.push(task);
      this.#ensureTurnArmed();
    },
  };

  readonly #stepProcess: <Result>(process: ProcessRef<Result>) => ProcessStep<Result>;
}
