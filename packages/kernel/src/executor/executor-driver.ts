import type { Processor, ProcessorTask } from "./processor";
import { readonlyArray, readonlySet } from "fp-ts";
import type { Disposer } from "#/utils";
import { FaultSink } from "./fault-sink";
import type { Pacer } from "./pacer";
import type { ProcessRef } from "#/contracts";
import type { ProcessStep } from "#/interpreter";

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

  public continueLater(work: () => void): Disposer {
    this.#scheduledWorks.add(work);
    this.#ensureTurnArmed();

    return () => {
      this.#scheduledWorks.delete(work);
    };
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
    if (this.#isStopped || this.#isTurnArmed || !this.#hasRunnableWork) {
      return;
    }

    this.#isTurnArmed = true;
    this.#pacer.continueLater(() => {
      this.#isTurnArmed = false;

      if (this.#isStopped) {
        return;
      }

      try {
        this.#runTurn();
      } finally {
        this.#ensureTurnArmed();
      }
    });
  }

  #runTurn(): void {
    const slice = this.#pacer.beginSlice();

    this.#runScheduledWork();

    while (this.#hasProcessorTask && !slice.shouldYield()) {
      this.#consumeProcessorTask();
    }
  }

  #runScheduledWork(): void {
    if (readonlySet.isEmpty(this.#scheduledWorks)) {
      return;
    }

    const scheduledWork = [...this.#scheduledWorks];
    this.#scheduledWorks.clear();

    const faultSink = new FaultSink("");
    for (const work of scheduledWork) {
      try {
        work();
      } catch (error) {
        faultSink.capture(error);
      }
    }
    faultSink.throwIfAny();
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

  get #hasRunnableWork(): boolean {
    return !readonlySet.isEmpty(this.#scheduledWorks) || this.#hasProcessorTask;
  }

  get #hasProcessorTask(): boolean {
    return readonlyArray.isNonEmpty(this.#processorTasks);
  }

  #isStopped = false;
  #isTurnArmed = false;
  readonly #pacer: Pacer;
  readonly #scheduledWorks = new Set<() => void>();
  readonly #processorTasks: ProcessorTask[] = [];
  readonly #processor: Processor = {
    admit: (task) => {
      this.#processorTasks.push(task);
      this.#ensureTurnArmed();
    },
  };

  readonly #stepProcess: <Result>(process: ProcessRef<Result>) => ProcessStep<Result>;
}
