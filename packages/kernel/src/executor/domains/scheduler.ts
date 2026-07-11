import { Domain } from "./domain.js";
import type { ProcessRef } from "#/contracts/index.js";
import type { ProcessState } from "#/interpreter/index.js";
import type { ProcessorTask } from "#/executor/processor.js";
import type { Scheduler } from "#/executor/autonomy.js";

export class SchedulerDomain extends Domain<SchedulerDomain> {
  public static root(scheduler: Scheduler, createTask: SchedulerTaskFactory): SchedulerDomain {
    return new SchedulerDomain(SchedulerDomain.sentinel(), scheduler, createTask);
  }

  public nest(scheduler: Scheduler, createTask: SchedulerTaskFactory): SchedulerDomain {
    const child = new SchedulerDomain(this, scheduler, createTask);
    super.addChild(child);
    return child;
  }

  public admitProcess(process: ProcessRef<unknown>, state: ProcessState): void {
    if (state.status === "open" && state.activity === "running") {
      this.scheduler.assign(process).admit(this.createTask(process));
    }
  }

  private constructor(
    parent: SchedulerDomain,
    private readonly scheduler: Scheduler,
    private readonly createTask: SchedulerTaskFactory,
  ) {
    super(parent);
  }
}

export type SchedulerTaskFactory = (process: ProcessRef<unknown>) => ProcessorTask;
