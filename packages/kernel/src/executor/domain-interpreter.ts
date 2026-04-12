import type { AutonomyOptions, ReaperOption, SchedulerOption } from "./autonomy";
import type { ProcessRef, Ritual, ScopeRef, Suppressor } from "#/contracts";
import { ReaperDomain, SchedulerDomain } from "./domains";
import { option, readonlyArray } from "fp-ts";
import type { Failure } from "#/failures";
import { FaultSink } from "./fault-sink";
import { Interpreter } from "#/interpreter";
import type { ProcessorTaskStatus } from "./processor";
import type { ScopeDescriptor } from "#/sigils";
import type { ScopeZone } from "#/interpreter";
import { autonomyOf } from "./autonomy";
import { interruptedFailure } from "#/failures";

export class DomainInterpreter extends Interpreter {
  public static createByAutonomy(
    entry: Ritual<unknown>,
    autonomy: SchedulerOption & ReaperOption,
    noteClosingObserved: () => void,
  ): DomainInterpreter {
    const interpreter = new DomainInterpreter(entry, autonomy, noteClosingObserved);
    interpreter.initialize();
    return interpreter;
  }

  public *startReaperTasks(
    suppressor: Suppressor,
  ): Iterable<readonly [ScopeRef<unknown>, ProcessRef<option.Option<Failure>>]> {
    for (const reaperDomain of ReaperDomain.domains(this.#reaperDomainRoot)) {
      if (!reaperDomain.hasClosingScope) {
        continue;
      }

      for (const { scope, worker } of reaperDomain.createWorkers((id) => this.scopeState(id))) {
        using faultSink = new FaultSink(
          "Out-of-band failures occurred while spawning a reaper adjudication process",
        );
        const process = this.spawn(reaperDomain.scopeRoot, worker, faultSink);
        const cause = faultSink.drain();
        if (option.isSome(cause)) {
          this.forceFailed(scope, interruptedFailure(cause.value), suppressor);

          continue;
        }

        yield [scope, process];
      }
    }
  }

  protected constructor(
    entry: Ritual<unknown>,
    autonomy: SchedulerOption & ReaperOption,
    private readonly noteClosingObserved: () => void,
  ) {
    const schedulerDomainRoot = SchedulerDomain.root(autonomy.scheduler, (process) =>
      this.#createProcessorTask(process),
    );
    const reaperDomainRoot = ReaperDomain.root(autonomy.reaper);

    const zoneRoot: DomainZone = {
      reaperDomain: reaperDomainRoot,
      schedulerDomain: schedulerDomainRoot,
      trackProcess: (process) => {
        schedulerDomainRoot.admitProcess(process, this.processState(process));
      },
      trackScope: (scope) => {
        const state = this.scopeState(scope);
        reaperDomainRoot.trackScope(scope, state);
        if (state.status === "closing") {
          noteClosingObserved();
        }
      },
    };

    super(entry, zoneRoot);

    this.#reaperDomainRoot = reaperDomainRoot;
  }

  protected override initialize(): void {
    super.initialize();

    this.#reaperDomainRoot.setScopeRoot(this.scopeRoot);
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
    const preparedZone = autonomy
      ? this.#createZone(domainZone, autonomy)
      : noOpPreparedZone(domainZone);
    const childScopeZone = preparedZone.zone;
    const childScope = super.scopeBranch(scope, entry, descriptor, childScopeZone, suppressor);

    if (this.#isClosedScope(childScope)) {
      preparedZone.rollback();
      return childScope;
    }

    this.#attachReaperDomains(
      domainZone.reaperDomain,
      childScopeZone.reaperDomain,
      scope,
      childScope,
    );
    this.#attachSchedulerDomains(
      domainZone.schedulerDomain,
      childScopeZone.schedulerDomain,
      childScope,
    );

    return childScope;
  }

  #attachReaperDomains(
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

  #attachSchedulerDomains(
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

  #createZone(domainZone: DomainZone, autonomy: AutonomyOptions): PreparedZone {
    const schedulerDomain =
      "scheduler" in autonomy
        ? domainZone.schedulerDomain.nest(autonomy.scheduler, (process) =>
            this.#createProcessorTask(process),
          )
        : domainZone.schedulerDomain;
    const reaperDomain =
      "reaper" in autonomy
        ? domainZone.reaperDomain.nest(autonomy.reaper)
        : domainZone.reaperDomain;

    const trackProcess =
      "scheduler" in autonomy
        ? (process: ProcessRef<unknown>, suppressor: Suppressor) => {
            try {
              schedulerDomain.admitProcess(process, this.processState(process));
            } catch (error) {
              this.forceFailed(this.scope(process), interruptedFailure(error), suppressor);
            }
          }
        : domainZone.trackProcess;
    const trackScope =
      "reaper" in autonomy
        ? (scope: ScopeRef<unknown>) => {
            const state = this.scopeState(scope);
            reaperDomain.trackScope(scope, state);
            if (state.status === "closing") {
              this.noteClosingObserved();
            }
          }
        : domainZone.trackScope;

    function rollback() {
      if (schedulerDomain !== domainZone.schedulerDomain) {
        schedulerDomain.close();
      }

      if (reaperDomain !== domainZone.reaperDomain) {
        reaperDomain.close();
      }
    }

    return {
      rollback,
      zone: {
        reaperDomain,
        schedulerDomain,
        trackProcess,
        trackScope,
      },
    };
  }

  #isClosedScope(scope: ScopeRef<unknown>): boolean {
    return this.scopeState(scope).status === "closed";
  }

  #createProcessorTask(process: ProcessRef<unknown>) {
    return {
      step: (suppressor: Suppressor): ProcessorTaskStatus => {
        const step = this.step(process, suppressor);
        switch (step.disposition) {
          case "waiting": {
            return "waiting";
          }
          case "exited": {
            return "exited";
          }
          case "ceded": {
            return "cede";
          }
          case "interpreted":
          case "resonated": {
            return "ready";
          }
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

function resolveDomainZone(zone: ScopeZone): DomainZone {
  return zone as DomainZone;
}

function noOpPreparedZone(zone: DomainZone): PreparedZone {
  return {
    rollback: () => {
      // No child domains were created.
    },
    zone,
  };
}

interface DomainZone extends ScopeZone {
  readonly reaperDomain: ReaperDomain;
  readonly schedulerDomain: SchedulerDomain;
}

interface PreparedZone {
  readonly rollback: () => void;
  readonly zone: DomainZone;
}
