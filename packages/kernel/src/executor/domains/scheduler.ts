import { Domain } from "./domain";
import type { ProcessRef } from "#/contracts";
import type { Processor } from "#/executor/processor";
import type { Scheduler } from "#/executor/autonomy";

export class SchedulerDomain extends Domain<SchedulerDomain> {
  public static root(scheduler: Scheduler): SchedulerDomain {
    return new SchedulerDomain(SchedulerDomain.sentinel(), scheduler);
  }

  public nest(scheduler: Scheduler): SchedulerDomain {
    const child = new SchedulerDomain(this, scheduler);
    super.attachChild(child);
    return child;
  }

  public assign(process: ProcessRef<unknown>): Processor {
    return this.#scheduler.assign(process);
  }

  private constructor(parent: SchedulerDomain, scheduler: Scheduler) {
    super(parent);
    this.#scheduler = scheduler;
  }

  readonly #scheduler: Scheduler;
}
