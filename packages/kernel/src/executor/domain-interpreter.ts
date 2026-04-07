import type { AutonomyOptions, ReaperOption, SchedulerOption } from "./autonomy";
import type { ProcessRef, Ritual, ScopeRef, Suppressor } from "#/contracts";
import { ReaperDomain, SchedulerDomain } from "./domains";
import { Interpreter } from "#/interpreter";
import type { ProcessorTaskStatus } from "./processor";
import type { ReaperTask } from "./domains";
import type { ScopeDescriptor } from "#/sigils";
import type { ScopeZone } from "#/interpreter";
import { autonomyOf } from "./autonomy";
import { readonlyArray } from "fp-ts";

export class DomainInterpreter extends Interpreter {
  public constructor(entry: Ritual<void>, autonomy: SchedulerOption & ReaperOption) {
    const schedulerDomainRoot = SchedulerDomain.root(autonomy.scheduler, (process) =>
      this.#schedulerTask(process),
    );
    const reaperDomainRoot = ReaperDomain.root(autonomy.reaper);
    const zoneRoot: DomainZone = {
      reaperDomain: reaperDomainRoot,
      schedulerDomain: schedulerDomainRoot,
      trackProcess: (process, suppressor) => {
        try {
          schedulerDomainRoot.trackProcess(process, this.processState(process));
        } catch (error) {
          suppressor.capture(error);
        }
      },
      trackScope: (scope, suppressor) => {
        try {
          reaperDomainRoot.trackScope(scope, this.scopeState(scope));
        } catch (error) {
          suppressor.capture(error);
        }
      },
    };

    super(entry, zoneRoot);
    reaperDomainRoot.setScopeRoot(this.scopeRoot);
    this.#reaperDomainRoot = reaperDomainRoot;
  }

  public *reaperTasks(suppressor: Suppressor): Iterable<ReaperTask> {
    for (const reaperDomain of ReaperDomain.domains(this.#reaperDomainRoot)) {
      if (!reaperDomain.hasClosingScope) {
        continue;
      }

      for (const task of reaperDomain.createTasks(
        (scope) => this.scopeState(scope),
        (scope, worker) => this.spawn(scope, worker, suppressor),
      )) {
        yield task;
      }
    }
  }

  // oxlint-disable-next-line max-params
  protected override scopeBranch(
    scope: ScopeRef<unknown>,
    entry: Ritual<unknown>,
    descriptor: ScopeDescriptor,
    zone: ScopeZone,
    suppressor: Suppressor,
  ): ScopeRef<unknown> {
    const domainZone = resolveDomainZone(zone);
    const autonomy = autonomyOf(descriptor);
    const childScopeZone = autonomy ? this.#createZone(domainZone, autonomy) : domainZone;
    const childScope = super.scopeBranch(scope, entry, descriptor, childScopeZone, suppressor);
    this.#registerReaperLeaf(
      domainZone.reaperDomain,
      childScopeZone.reaperDomain,
      scope,
      childScope,
    );
    this.#registerSchedulerDomainClose(
      domainZone.schedulerDomain,
      childScopeZone.schedulerDomain,
      childScope,
    );

    return childScope;
  }

  #registerReaperLeaf(
    reaperDomain: ReaperDomain,
    childReaperDomain: ReaperDomain,
    scope: ScopeRef<unknown>,
    childScope: ScopeRef<unknown>,
  ): void {
    if (childReaperDomain === reaperDomain) {
      this.#moveReaperLeaf(reaperDomain, scope, childScope);
      return;
    }

    childReaperDomain.setScopeRoot(childScope);
    this.wait(childScope.exitFuture, () => {
      childReaperDomain.close();
      this.#tryRestoreReaperLeaf(reaperDomain, scope);
    });
  }

  #moveReaperLeaf(
    reaperDomain: ReaperDomain,
    scope: ScopeRef<unknown>,
    childScope: ScopeRef<unknown>,
  ): void {
    reaperDomain.removeLeafScope(scope);
    reaperDomain.addLeafScope(childScope);
    this.wait(childScope.exitFuture, () => {
      reaperDomain.removeLeafScope(childScope);
      this.#tryRestoreReaperLeaf(reaperDomain, scope);
    });
  }

  #registerSchedulerDomainClose(
    schedulerDomain: SchedulerDomain,
    childSchedulerDomain: SchedulerDomain,
    childScope: ScopeRef<unknown>,
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
        ? (trackedProcess: ProcessRef<unknown>, suppressor: Suppressor) => {
            try {
              schedulerDomain.trackProcess(trackedProcess, this.processState(trackedProcess));
            } catch (error) {
              suppressor.capture(error);
            }
          }
        : domainZone.trackProcess;
    const trackScope =
      "reaper" in autonomy
        ? (scope: ScopeRef<unknown>, suppressor: Suppressor) => {
            try {
              reaperDomain.trackScope(scope, this.scopeState(scope));
            } catch (error) {
              suppressor.capture(error);
            }
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
      step: (suppressor: Suppressor): ProcessorTaskStatus => {
        const step = this.step(process, suppressor);
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

  #tryRestoreReaperLeaf(reaperDomain: ReaperDomain, scope: ScopeRef<unknown>): void {
    const state = this.scopeState(scope);
    if (state.status === "closed" || readonlyArray.isNonEmpty(state.children)) {
      return;
    }

    reaperDomain.addLeafScope(scope);
  }

  readonly #reaperDomainRoot: ReaperDomain;
}

export type { ReaperTask } from "./domains";

function resolveDomainZone(zone: ScopeZone): DomainZone {
  return zone as DomainZone;
}

interface DomainZone extends ScopeZone {
  readonly reaperDomain: ReaperDomain;
  readonly schedulerDomain: SchedulerDomain;
}
