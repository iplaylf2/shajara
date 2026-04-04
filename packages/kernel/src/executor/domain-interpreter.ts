import type { AutonomyOptions, ReaperOption, SchedulerOption } from "./autonomy";
import type { ProcessRef, Ritual, ScopeRef } from "#/contracts";
import { ReaperDomain, SchedulerDomain } from "./domains";
import type { Failure } from "#/failures";
import { Interpreter } from "#/interpreter";
import type { Option } from "#/utils";
import type { ProcessorTaskStatus } from "./processor";
import type { ScopeDescriptor } from "#/sigils";
import type { ScopeZone } from "#/interpreter";
import { autonomyOf } from "./autonomy";

export class DomainInterpreter extends Interpreter {
  public constructor(entry: Ritual<void>, autonomy: SchedulerOption & ReaperOption) {
    const schedulerDomainRoot = SchedulerDomain.root(autonomy.scheduler, (process) =>
      this.#schedulerTask(process),
    );
    const reaperDomainRoot = ReaperDomain.root(autonomy.reaper);
    const zoneRoot: DomainZone = {
      reaperDomain: reaperDomainRoot,
      schedulerDomain: schedulerDomainRoot,
      trackProcess: (process) => {
        schedulerDomainRoot.trackProcess(process, this.processState(process));
      },
      trackScope: (scope) => {
        reaperDomainRoot.trackScope(scope, this.scopeState(scope));
      },
    };

    super(entry, zoneRoot);
    reaperDomainRoot.addLeafScope(this.scopeRoot);
    this.#reaperDomainRoot = reaperDomainRoot;
  }

  public *reaperTasks(): Iterable<ReaperTask> {
    for (const reaperDomain of this.#reaperDomainRoot.domains()) {
      for (const scope of reaperDomain.frontiers((trackedScope) => this.scopeState(trackedScope))) {
        yield {
          spawn: () => {
            if (!reaperDomain.isFrontier(scope, (trackedScope) => this.scopeState(trackedScope))) {
              return null;
            }

            return this.spawn(this.scopeRoot, () => reaperDomain.reaper.reap(scope));
          },
        };
      }
    }
  }

  protected override scopeBranch(
    scope: ScopeRef<unknown>,
    entry: Ritual<unknown>,
    descriptor: ScopeDescriptor,
    zone: ScopeZone,
  ): ScopeRef<unknown> {
    const domainZone = resolveDomainZone(zone);
    const autonomy = autonomyOf(descriptor);
    if (autonomy) {
      return this.#scopeBranchAutonomy(scope, domainZone, autonomy, (childScopeZone) =>
        super.scopeBranch(scope, entry, descriptor, childScopeZone),
      );
    }

    return super.scopeBranch(scope, entry, descriptor, domainZone);
  }

  #scopeBranchAutonomy(
    scope: ScopeRef<unknown>,
    zone: DomainZone,
    autonomy: AutonomyOptions,
    scopeBranch: (zone: DomainZone) => ScopeRef<unknown>,
  ): ScopeRef<unknown> {
    const childScopeZone = this.#createZone(zone, autonomy);
    const childScope = scopeBranch(childScopeZone);
    this.#branchReaperScope(scope, childScope, zone.reaperDomain, childScopeZone.reaperDomain);
    this.#closeSchedulerDomain(childScope, zone.schedulerDomain, childScopeZone.schedulerDomain);

    return childScope;
  }

  #branchReaperScope(
    scope: ScopeRef<unknown>,
    childScope: ScopeRef<unknown>,
    reaperDomain: ReaperDomain,
    childReaperDomain: ReaperDomain,
  ): void {
    if (childReaperDomain === reaperDomain) {
      childReaperDomain.removeLeafScope(scope);
      childReaperDomain.addLeafScope(childScope);
      this.wait(childScope.exitFuture, () => {
        childReaperDomain.removeLeafScope(childScope);
        this.#restoreReaperLeaf(scope, reaperDomain);
      });
      return;
    }

    childReaperDomain.addLeafScope(childScope);
    this.wait(childScope.exitFuture, () => {
      childReaperDomain.removeLeafScope(childScope);
      childReaperDomain.close();
      this.#restoreReaperLeaf(scope, reaperDomain);
    });
  }

  #closeSchedulerDomain(
    childScope: ScopeRef<unknown>,
    schedulerDomain: SchedulerDomain,
    childSchedulerDomain: SchedulerDomain,
  ): void {
    if (childSchedulerDomain === schedulerDomain) {
      return;
    }

    this.wait(childScope.exitFuture, () => {
      childSchedulerDomain.close();
    });
  }

  #createZone(domainZone: DomainZone, autonomy: AutonomyOptions): DomainZone {
    const schedulerDomain =
      "scheduler" in autonomy
        ? domainZone.schedulerDomain.nest(autonomy.scheduler, (process) =>
            this.#schedulerTask(process),
          )
        : domainZone.schedulerDomain;
    const reaperDomain =
      "reaper" in autonomy
        ? domainZone.reaperDomain.nest(autonomy.reaper)
        : domainZone.reaperDomain;
    const trackProcess =
      "scheduler" in autonomy
        ? (trackedProcess: ProcessRef<unknown>) => {
            schedulerDomain.trackProcess(trackedProcess, this.processState(trackedProcess));
          }
        : domainZone.trackProcess;
    const trackScope =
      "reaper" in autonomy
        ? (scope: ScopeRef<unknown>) => {
            reaperDomain.trackScope(scope, this.scopeState(scope));
          }
        : domainZone.trackScope;

    return {
      reaperDomain,
      schedulerDomain,
      trackProcess,
      trackScope,
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

  #reaperDomain(scope: ScopeRef<unknown>): ReaperDomain {
    return resolveDomainZone(this.scopeState(scope).zone).reaperDomain;
  }

  #restoreReaperLeaf(scope: ScopeRef<unknown>, reaperDomain: ReaperDomain): void {
    const state = this.scopeState(scope);
    if (state.status === "closed") {
      return;
    }

    for (const child of state.children) {
      if (this.#reaperDomain(child) === reaperDomain) {
        return;
      }
    }

    reaperDomain.addLeafScope(scope);
  }

  readonly #reaperDomainRoot: ReaperDomain;
}

export interface ReaperTask {
  spawn(): ProcessRef<Option<Failure>> | null;
}

function resolveDomainZone(zone: ScopeZone): DomainZone {
  return zone as DomainZone;
}

interface DomainZone extends ScopeZone {
  readonly reaperDomain: ReaperDomain;
  readonly schedulerDomain: SchedulerDomain;
}
