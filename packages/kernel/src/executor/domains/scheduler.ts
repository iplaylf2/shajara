import { Domain } from "./domain";
import type { ProcessRef } from "#/contracts";
import type { ProcessState } from "#/interpreter";
import type { ProcessorTask } from "#/executor/processor";
import type { Scheduler } from "#/executor/autonomy";

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
