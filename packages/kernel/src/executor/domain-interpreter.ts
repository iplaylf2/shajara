import type { ProcessRef, Ritual, ScopeRef } from "#/contracts";
import type { ReaperOption, SchedulerOption } from "./autonomy";
import { Interpreter } from "#/interpreter";
import type { ProcessorTaskStatus } from "./processor";
import { SchedulerDomain } from "./domains";
import type { ScopeDescriptor } from "#/sigils";
import type { ScopeZone } from "#/interpreter";
import { autonomyOf } from "./autonomy";

export class DomainInterpreter extends Interpreter {
  public constructor(entry: Ritual<void>, autonomy: SchedulerOption & ReaperOption) {
    const schedulerDomainRoot = SchedulerDomain.root(autonomy.scheduler, (process) =>
      this.#schedulerTask(process),
    );
    const zoneRoot: DomainZone = {
      schedulerDomain: schedulerDomainRoot,
      trackProcess: (process) => {
        schedulerDomainRoot.trackProcess(process);
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
    if (!autonomy || !("scheduler" in autonomy)) {
      return super.scopeBranch(scope, entry, descriptor, domainZone);
    }

    const schedulerDomain = domainZone.schedulerDomain.nest(autonomy.scheduler, (process) =>
      this.#schedulerTask(process),
    );
    const childScopeZone: DomainZone = {
      schedulerDomain,
      trackProcess: (process) => {
        schedulerDomain.trackProcess(process);
      },
      trackScope: (trackedScope) => {
        domainZone.trackScope(trackedScope);
      },
    };
    const childScope = super.scopeBranch(scope, entry, descriptor, childScopeZone);

    this.wait(childScope.exitFuture, () => {
      schedulerDomain.close();
    });

    return childScope;
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
