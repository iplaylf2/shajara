import type { AutonomyScopeDescriptor, Scheduler } from "./autonomy";
import type { ProcessRef, Ritual, ScopeRef } from "#/contracts";
import { Interpreter } from "#/interpreter";
import type { ProcessorTaskStatus } from "./processor";
import type { ScopeDescriptor } from "#/sigils";
import type { ScopeZone } from "#/interpreter";

export class GovernedInterpreter extends Interpreter {
  public constructor(entry: Ritual<void>) {
    super(entry);
  }

  protected override scopeBranch(
    scope: ScopeRef<unknown>,
    entry: Ritual<unknown>,
    descriptor: ScopeDescriptor,
    zone: ScopeZone,
  ): ScopeRef<unknown> {
    const scheduler = schedulerFrom(descriptor);
    const childZone = scheduler
      ? {
          trackProcess: (process: ProcessRef<unknown>) => {
            if (this.isRunnable(process)) {
              this.#scheduleProcess(process, scheduler);
            }
          },
          trackScope: () => {
            // Scheduler autonomy currently governs runnable process routing only.
          },
        }
      : zone;

    return super.scopeBranch(scope, entry, descriptor, childZone);
  }

  #scheduleProcess(process: ProcessRef<unknown>, scheduler: Scheduler): void {
    scheduler.assign(process).drive({
      step: () => this.#stepScheduledProcess(process),
    });
  }

  #stepScheduledProcess(process: ProcessRef<unknown>): ProcessorTaskStatus {
    if (!this.isRunnable(process)) {
      return this.processStatus(process) === "closed" ? "exited" : "waiting";
    }

    const step = this.step(process);
    switch (step.disposition) {
      case "waiting":
        return "waiting";
      case "exited":
        return "exited";
      case "ceded":
        return "cede";
      case "interpreted":
      case "resonated":
        return "ready";
    }
  }
}

function schedulerFrom(descriptor: ScopeDescriptor): Scheduler | null {
  if (!isAutonomyScopeDescriptor(descriptor)) {
    return null;
  }

  if (!("scheduler" in descriptor.autonomy)) {
    return null;
  }

  return descriptor.autonomy.scheduler;
}

function isAutonomyScopeDescriptor(
  descriptor: ScopeDescriptor,
): descriptor is AutonomyScopeDescriptor {
  return "autonomy" in descriptor;
}
