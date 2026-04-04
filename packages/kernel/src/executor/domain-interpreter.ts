import type { AutonomyOptions, ReaperOption, SchedulerOption } from "./autonomy";
import type { ProcessRef, Ritual, ScopeRef } from "#/contracts";
import { Interpreter } from "#/interpreter";
import type { ProcessorTaskStatus } from "./processor";
import { SchedulerDomain } from "./domains";
import type { ScopeDescriptor } from "#/sigils";
import type { ScopeZone } from "#/interpreter";
import { autonomyOf } from "./autonomy";

export class DomainInterpreter extends Interpreter {
  public constructor(entry: Ritual<void>, autonomy: SchedulerOption & ReaperOption) {
    const schedulerDomainRoot = SchedulerDomain.root(autonomy.scheduler);
    const zoneRoot: DomainZone = {
      schedulerDomain: schedulerDomainRoot,
      trackProcess: (process) => {
        schedulerDomainRoot.assign(process).drive(this.#schedulerTask(process));
      },
      trackScope: () => {
        // Should use by reaper domain
      },
    };

    super(entry, zoneRoot);
  }

  protected override scopeBranch(
    scope: ScopeRef<unknown>,
    entry: Ritual<unknown>,
    descriptor: ScopeDescriptor,
    zone: ScopeZone,
  ): ScopeRef<unknown> {
    const domainZone = resolveDomainZone(zone);
    const autonomy = autonomyOf(descriptor);
    const childScopeZone = autonomy ? this.#createZone(domainZone, autonomy) : domainZone;
    return super.scopeBranch(scope, entry, descriptor, childScopeZone);
  }

  #createZone(zone: DomainZone, autonomy: AutonomyOptions): DomainZone {
    const { schedulerDomain } = zone;
    if (!("scheduler" in autonomy)) {
      return zone;
    }

    const schedulerDomainChild = schedulerDomain.nest(autonomy.scheduler);
    return {
      schedulerDomain: schedulerDomainChild,
      trackProcess: (process) => {
        schedulerDomainChild.assign(process).drive(this.#schedulerTask(process));
      },
      trackScope: (scope) => {
        zone.trackScope(scope);
      },
    };
  }

  #schedulerTask(process: ProcessRef<unknown>) {
    return {
      step: (): ProcessorTaskStatus => {
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
      },
    };
  }
}

function resolveDomainZone(zone: ScopeZone): DomainZone {
  return zone as DomainZone;
}

interface DomainZone extends ScopeZone {
  readonly schedulerDomain: SchedulerDomain;
}
