// oxlint-disable sort-imports
import type { ProcessRef, Ritual, ScopeRef } from "#/contracts";
import type { Failure } from "#/failures";
import type { Option } from "#/utils";
import type { AutonomyOptions, ReaperOption, SchedulerOption } from "./autonomy";
import { Interpreter } from "#/interpreter";
import type { ProcessorTaskStatus } from "./processor";
import { ReaperDomain, SchedulerDomain } from "./domains";
import type { ScopeDescriptor } from "#/sigils";
import type { ScopeZone } from "#/interpreter";
import { autonomyOf } from "./autonomy";
import { io } from "fp-ts";

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
    this.#zoneRoot = zoneRoot;
  }

  public *reaperTasks(): Iterable<ReaperTask> {
    for (const scope of this.#zoneRoot.reaperDomain.frontiers(
      this.scopeRoot,
      (trackedScope) => this.scopeState(trackedScope),
      (trackedScope) => this.#reaperDomain(trackedScope),
    )) {
      const reaperDomain = this.#reaperDomain(scope);
      yield {
        spawn: () => {
          if (
            !reaperDomain.isFrontier(
              scope,
              this.scopeRoot,
              (trackedScope) => this.scopeState(trackedScope),
              (trackedScope) => this.#reaperDomain(trackedScope),
            )
          ) {
            return null;
          }

          return this.spawn(this.scopeRoot, () => reaperDomain.reaper.reap(scope));
        },
      };
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
      const { childScopeZone, onChildScope } = this.#scopeBranchAutonomy(domainZone, autonomy);
      const childScope = super.scopeBranch(scope, entry, descriptor, childScopeZone);
      onChildScope(childScope);
      return childScope;
    }

    return super.scopeBranch(scope, entry, descriptor, domainZone);
  }

  #scopeBranchAutonomy(domainZone: DomainZone, autonomy: AutonomyOptions) {
    const hasScheduler = "scheduler" in autonomy;
    const hasReaper = "reaper" in autonomy;

    const schedulerDomain = hasScheduler
      ? domainZone.schedulerDomain.nest(autonomy.scheduler, (process) =>
          this.#schedulerTask(process),
        )
      : domainZone.schedulerDomain;
    const reaperDomain = hasReaper
      ? domainZone.reaperDomain.nest(autonomy.reaper)
      : domainZone.reaperDomain;
    const trackProcess = hasScheduler
      ? (trackedProcess: ProcessRef<unknown>) => {
          schedulerDomain.trackProcess(trackedProcess, this.processState(trackedProcess));
        }
      : domainZone.trackProcess;
    const trackScope = hasReaper
      ? (trackedScope: ScopeRef<unknown>) => {
          reaperDomain.trackScope(trackedScope, this.scopeState(trackedScope));
        }
      : domainZone.trackScope;

    const childScopeZone = {
      reaperDomain,
      schedulerDomain,
      trackProcess,
      trackScope,
    } satisfies DomainZone;
    const onChildScope = hasScheduler
      ? (childScope: ScopeRef<unknown>) => {
          this.wait(childScope.exitFuture, () => {
            schedulerDomain.close();
          });
        }
      : io.Do;

    return {
      childScopeZone,
      onChildScope,
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

  #zoneRoot: DomainZone;
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
