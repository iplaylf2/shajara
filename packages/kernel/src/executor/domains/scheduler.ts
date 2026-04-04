import { Domain } from "./domain";
import type { ProcessRef } from "#/contracts";
import type { ProcessorTask } from "#/executor/processor";
import type { Scheduler } from "#/executor/autonomy";

export class SchedulerDomain extends Domain<SchedulerDomain> {
  public static root(scheduler: Scheduler, createTask: SchedulerTaskFactory): SchedulerDomain {
    return new SchedulerDomain(SchedulerDomain.sentinel(), scheduler, createTask);
  }

  public nest(scheduler: Scheduler, createTask: SchedulerTaskFactory): SchedulerDomain {
    const child = new SchedulerDomain(this, scheduler, createTask);
    super.attachChild(child);
    return child;
  }

  public trackProcess(process: ProcessRef<unknown>): void {
    this.#scheduler.assign(process).drive(this.#createTask(process));
  }

  private constructor(
    parent: SchedulerDomain,
    scheduler: Scheduler,
    createTask: SchedulerTaskFactory,
  ) {
    super(parent);
    this.#scheduler = scheduler;
    this.#createTask = createTask;
  }

  readonly #createTask: SchedulerTaskFactory;
  readonly #scheduler: Scheduler;
}

export type SchedulerTaskFactory = (process: ProcessRef<unknown>) => ProcessorTask;
