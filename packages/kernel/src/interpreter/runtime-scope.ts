// oxlint-disable class-methods-use-this, max-lines
import type {
  ContextKey,
  MessageKey,
  ProcessDescriptor,
  Ritual,
  ScopeDescriptor,
  ScopeRef,
} from "#/contracts";
import { P, match } from "ts-pattern";
import { either, io, option, readonlySet } from "fp-ts";
import type { Failure } from "#/failures";
import { RuntimeFuture } from "./runtime-future";
import { RuntimeMailbox } from "./runtime-mailbox";
import { RuntimeProcess } from "./runtime-process";
import { ScopeFailureDraft } from "./scope-failure-draft";
import type { Unsubscribe } from "#/interpreter-kit";
import { canceledFailure } from "#/failures";
import { unreachable } from "#/utils";

export class RuntimeScope {
  public static create(
    entry: Ritual<unknown>,
    descriptor: ScopeDescriptor,
    zone: RuntimeZone,
  ): RuntimeScope {
    return new RuntimeScope(entry, descriptor, RuntimeScope.#sentinel, zone);
  }

  public branch(
    entry: Ritual<unknown>,
    descriptor: ScopeDescriptor,
    zone: RuntimeZone = this.#zone,
  ): RuntimeScope {
    const child = new RuntimeScope(entry, descriptor, this, zone);

    this.#registerChildScope(child);

    return child;
  }

  public spawn<Relic>(worker: Ritual<Relic>, descriptor: ProcessDescriptor): RuntimeProcess<Relic> {
    const spawnedProcess = new RuntimeProcess<Relic>(this.#ref, worker, descriptor);

    this.#registerOwnedProcess(spawnedProcess);

    return spawnedProcess;
  }

  public createFuture<Result>(): RuntimeFuture<Result> {
    const future = new RuntimeFuture<Result>();

    this.#derivedFutures.add(future);

    future.wait(() => {
      this.#derivedFutures.delete(future);
    });

    return future;
  }

  public lookup<Value>(contextKey: ContextKey<Value>): option.Option<Value> {
    if (this.#bindings.has(contextKey)) {
      return option.some(this.#bindings.get(contextKey) as Value);
    }

    if (this.#parent === RuntimeScope.#sentinel) {
      return option.none;
    }

    return this.#parent.lookup(contextKey);
  }

  public bind<Value>(contextKey: ContextKey<Value>, value: Value): void {
    this.#bindings.set(contextKey, value);
  }

  public unbind(contextKey: ContextKey<unknown>): void {
    this.#bindings.delete(contextKey);
  }

  public send<Value>(targetScope: RuntimeScope, messageKey: MessageKey<Value>, value: Value): void {
    targetScope.#acceptMessage(messageKey, value);
  }

  public tryReceive<Value>(messageKey: MessageKey<Value>): option.Option<Value> {
    return this.#mailbox.tryReceive(messageKey);
  }

  public receive(process: RuntimeProcess<unknown>, messageKey: MessageKey<unknown>): void {
    this.#mailbox.receive(process, messageKey);
  }

  public observe(observer: RuntimeScopeObserver): Unsubscribe {
    this.#observers.add(observer);

    return () => {
      this.#observers.delete(observer);
    };
  }

  public cancel(): void {
    if (this.status === "failing") {
      const { draft } = this.#stateAs(this.status);

      this.#enterFailing(draft, io.Do);
    } else {
      this.#enterCanceling();
    }
  }

  public get ref(): ScopeRef<unknown> {
    return this.#ref;
  }

  public get descriptor(): ScopeDescriptor {
    return this.#descriptor;
  }

  public get isClosed(): boolean {
    switch (this.status) {
      case "running":
      case "closing":
      case "canceling":
      case "failing":
        return false;
      case "completed":
      case "canceled":
      case "failed":
        return true;
    }
  }

  public get status(): RuntimeScopeStatus {
    return this.#state.status;
  }

  public get exitFuture(): RuntimeFuture<unknown> {
    return this.#exitFuture;
  }

  public get entryProcess(): RuntimeProcess<unknown> {
    return this.#entryProcess;
  }

  private constructor(
    entry: Ritual<unknown>,
    descriptor: ScopeDescriptor,
    parent: RuntimeScope,
    zone: RuntimeZone,
  ) {
    this.#exitFuture = new RuntimeFuture<unknown>();
    this.#zone = zone;
    const [scopeExitFuture] = this.#exitFuture.handle;
    this.#ref = { exitFuture: scopeExitFuture } as ScopeRef<unknown>;

    const entryProcess = new RuntimeProcess(this.#ref, entry, { completionMode: "structural" });

    this.#registerOwnedProcess(entryProcess);

    this.#entryProcess = entryProcess;
    this.#descriptor = descriptor;

    this.#parent = parent;
  }

  #registerChildScope(scope: RuntimeScope) {
    this.#children.add(scope);

    scope.observe(() => {
      if (scope.isClosed) {
        this.#children.delete(scope);
      }

      this.#driveByChildScope(scope);
    });
  }

  #registerOwnedProcess(process: RuntimeProcess<unknown>): void {
    const ownedProcesses = this.#processContainerFor(process);

    ownedProcesses.add(process);

    process.observe(() => {
      if (process.isClosed) {
        ownedProcesses.delete(process);
      }

      this.#zone.trackProcess(process);
      this.#driveByOwnedProcess(process);
    });
  }

  #driveByChildScope(scope: RuntimeScope): void {
    match([this.status, scope.status])
      .with(["running", P.union("completed", "failed", "canceled")], () => {
        this.#tryClosing();
      })
      .with(["closing", P.union("completed", "canceled", "failed")], () => {
        this.#tryCompleted();
      })
      .with(["canceling", P.union("completed", "canceled", "failed")], () => {
        this.#tryCanceled();
      })
      .with(["failing", P.union("completed", "canceled")], ([status]) => {
        const state = this.#stateAs(status);
        this.#tryFailed(state.draft);
      })
      .with(["failing", "failed"], ([status, scopeStatus]) => {
        const state = this.#stateAs(status);
        state.draft.collect(scope.#stateAs(scopeStatus).failure);
        this.#tryFailed(state.draft);
      })
      .with([P.union("running", "closing", "canceling"), "failing"], () => {
        if (scope.descriptor.failureMode === "propagate") {
          const draft = new ScopeFailureDraft(
            { kind: "scope", scope: scope.ref },
            () => scope.#stateAs("failed").failure,
          );

          this.#enterFailing(draft, io.Do);
        }
      })
      .with(["failing", "failing"], ([status]) => {
        if (scope.descriptor.failureMode === "propagate") {
          const { draft } = this.#stateAs(status);

          this.#enterFailing(draft, io.Do);
        }
      })
      .with([P.union("completed", "canceled", "failed"), P._], unreachable)
      .with([P._, P.union("running", "closing", "canceling")], io.Do)
      .exhaustive();
  }

  #driveByOwnedProcess(process: RuntimeProcess<unknown>): void {
    match([this.status, process.status])
      .with(["running", "completed"], () => {
        this.#triggerCleanup(process);
        this.#tryClosing();
      })
      .with(["running", "canceled"], unreachable)
      .with(["closing", P.union("completed", "canceled")], () => {
        this.#triggerCleanup(process);
        this.#tryCompleted();
      })
      .with(["canceling", P.union("completed", "canceled")], () => {
        this.#triggerCleanup(process);
        this.#tryCanceled();
      })
      .with(["failing", P.union("completed", "canceled")], ([status]) => {
        const { draft } = this.#stateAs(status);

        this.#triggerCleanup(process);
        this.#tryFailed(draft);
      })
      .with([P.union("running", "closing", "canceling"), "failed"], () => {
        const draft = new ScopeFailureDraft({ kind: "process", process: process.ref }, () =>
          failureOfProcess(process),
        );

        this.#enterFailing(draft, () => {
          this.#triggerCleanup(process);
        });
      })
      .with(["failing", "failed"], ([status]) => {
        const { draft } = this.#stateAs(status);

        draft.collect(failureOfProcess(process));
        this.#enterFailing(draft, () => {
          this.#triggerCleanup(process);
        });
      })
      .with([P.union("completed", "canceled", "failed"), P._], unreachable)
      .with([P._, P.union("running", "waiting")], io.Do)
      .exhaustive();
  }

  #tryClosing(): void {
    if (this.#isQuiet()) {
      this.#enterClosing();
    }
  }

  #enterClosing(): void {
    this.#transitionTo({ status: "closing" });
    this.#cancelDetached();
    this.#tryCompleted();
  }

  #tryCompleted(): void {
    if (this.#isIdle()) {
      this.#cancelDerivedFutures();

      this.exitFuture.settle(either.right(resultOfProcess(this.#entryProcess)));
      this.#transitionTo({ status: "completed" });
    }
  }

  #enterCanceling(): void {
    this.#transitionTo({ status: "canceling" });
    this.#cancelManaged();
    this.#tryCanceled();
  }

  #tryCanceled(): void {
    if (this.#isIdle()) {
      this.#cancelDerivedFutures();

      const canceled = either.left(canceledFailure());
      this.exitFuture.settle(canceled);
      this.#transitionTo({ status: "canceled" });
    }
  }

  #enterFailing(draft: ScopeFailureDraft, beforeTry: () => void): void {
    this.#transitionTo({ draft, status: "failing" });
    this.#cancelManaged();
    beforeTry();
    this.#tryFailed(draft);
  }

  #tryFailed(draft: ScopeFailureDraft): void {
    if (this.#isIdle()) {
      this.#cancelDerivedFutures();

      const failure = draft.build();
      const failed = either.left(failure);
      this.exitFuture.settle(failed);
      this.#transitionTo({
        failure,
        status: "failed",
      });
    }
  }

  #triggerCleanup(process: RuntimeProcess<unknown>): void {
    const spawn = (worker: Ritual<void>): RuntimeProcess<void> =>
      this.spawn(worker, { completionMode: "structural" });

    for (const cleanup of process.takeCleanups()) {
      cleanup(spawn);
    }
  }

  #acceptMessage<Value>(messageKey: MessageKey<Value>, value: Value): void {
    this.#mailbox.send(messageKey, value);
  }

  #cancelManaged(): void {
    const processes = [...this.#structuralProcesses, ...this.#detachedProcesses];
    const children = [...this.#children];

    this.#cancelProcesses(processes);

    for (const child of children) {
      child.cancel();
    }
  }

  #cancelDetached(): void {
    this.#cancelProcesses([...this.#detachedProcesses]);
  }

  #cancelProcesses(processes: readonly RuntimeProcess<unknown>[]): void {
    for (const process of processes) {
      process.cancel();
    }
  }

  #cancelDerivedFutures(): void {
    const canceled = either.left(canceledFailure());

    for (const future of this.#derivedFutures) {
      future.settle(canceled);
    }
  }

  #processContainerFor(process: RuntimeProcess<unknown>): Set<RuntimeProcess<unknown>> {
    if (process.descriptor.completionMode === "structural") {
      return this.#structuralProcesses;
    }
    return this.#detachedProcesses;
  }

  #isQuiet(): boolean {
    return readonlySet.isEmpty(this.#structuralProcesses) && readonlySet.isEmpty(this.#children);
  }

  #isIdle(): boolean {
    return this.#isQuiet() && readonlySet.isEmpty(this.#detachedProcesses);
  }

  #transitionTo(state: RuntimeScopeState): void {
    this.#state = state;
    this.#notifyObservers();

    if (this.isClosed) {
      this.#mailbox.clear();
      this.#observers.clear();
    }
  }

  #stateAs<Status extends RuntimeScopeStatus>(status: Status): RuntimeScopeStateOf<Status> {
    // oxlint-disable-next-line no-void
    void status;
    return this.#state as RuntimeScopeStateOf<Status>;
  }

  #notifyObservers(): void {
    for (const observer of this.#observers) {
      observer();
    }
  }

  static readonly #sentinel = null as unknown as RuntimeScope;

  readonly #exitFuture: RuntimeFuture<unknown>;
  readonly #ref: ScopeRef<unknown>;
  readonly #entryProcess: RuntimeProcess<unknown>;
  readonly #parent: RuntimeScope;
  readonly #descriptor: ScopeDescriptor;
  readonly #zone: RuntimeZone;

  #state: RuntimeScopeState = { status: "running" };
  readonly #children = new Set<RuntimeScope>();
  readonly #observers = new Set<RuntimeScopeObserver>();
  readonly #mailbox = new RuntimeMailbox();

  readonly #derivedFutures = new Set<RuntimeFuture<unknown>>();

  readonly #structuralProcesses = new Set<RuntimeProcess<unknown>>();
  readonly #detachedProcesses = new Set<RuntimeProcess<unknown>>();

  readonly #bindings = new Map<ContextKey<unknown>, unknown>();
}

export interface RuntimeZone {
  trackProcess(process: RuntimeProcess<unknown>): void;
}

export type RuntimeScopeStatus = RuntimeScopeState["status"];

export type RuntimeScopeObserver = () => void;

type RuntimeScopeState =
  | { readonly status: "running" }
  | { readonly status: "closing" }
  | { readonly status: "completed" }
  | { readonly status: "canceling" }
  | { readonly status: "canceled" }
  | {
      readonly status: "failing";
      readonly draft: ScopeFailureDraft;
    }
  | {
      readonly status: "failed";
      readonly failure: Failure;
    };

type RuntimeScopeStateOf<Status extends RuntimeScopeStatus> = Extract<
  RuntimeScopeState,
  { readonly status: Status }
>;

function failureOfProcess(process: RuntimeProcess<unknown>): Failure {
  return (process.result as either.Left<Failure>).left;
}

function resultOfProcess(process: RuntimeProcess<unknown>): unknown {
  return (process.result as either.Right<unknown>).right;
}
