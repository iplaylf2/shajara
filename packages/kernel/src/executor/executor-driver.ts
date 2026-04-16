import type { Processor, ProcessorTask } from "./processor";
import { FaultSink } from "./fault-sink";
import type { Pacer } from "./pacer";
import type { ProcessRef } from "#/contracts";
import type { ProcessStep } from "#/interpreter/index";
import { readonlyArray } from "fp-ts";

export class ExecutorDriver {
  public stop(): void {
    this.#isStopped = true;
  }

  public driveSyncUnsafely<Result>(process: ProcessRef<Result>): ProcessStep<Result> {
    while (true) {
      const step = this.stepProcess(process);
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
    private readonly pacer: Pacer,
    private readonly stepProcess: <Result>(process: ProcessRef<Result>) => ProcessStep<Result>,
  ) {}

  public get processor(): Processor {
    return this.#processor;
  }

  #ensureTurnArmed(): void {
    if (this.#isStopped || this.#isTurnArmed || !this.#hasProcessorTask) {
      return;
    }

    this.#isTurnArmed = true;
    this.pacer.continueLater(() => {
      if (this.#isStopped) {
        this.#isTurnArmed = false;
        return;
      }

      try {
        this.#runTurn();
      } finally {
        this.#isTurnArmed = false;
        this.#ensureTurnArmed();
      }
    });
  }

  #runTurn(): void {
    const slice = this.pacer.beginSlice();

    while (this.#hasProcessorTask && !slice.shouldYield()) {
      this.#consumeProcessorTask();
    }
  }

  #consumeProcessorTask(): void {
    const [task] = this.#processorTasks;
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
          this.#processorTasks.shift();
          this.#processorTasks.push(task!);
          return;
        }
        case "waiting":
        case "exited": {
          this.#processorTasks.shift();
          return;
        }
      }
    }
  }

  get #hasProcessorTask(): boolean {
    return readonlyArray.isNonEmpty(this.#processorTasks);
  }

  #isStopped = false;
  #isTurnArmed = false;
  readonly #processorTasks: ProcessorTask[] = [];
  readonly #processor: Processor = {
    admit: (task) => {
      this.#processorTasks.push(task);
      this.#ensureTurnArmed();
    },
  };
}
