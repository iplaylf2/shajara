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
import { either, io, option, readonlyArray, readonlySet } from "fp-ts";
import type { Failure } from "#/failures";
import { RuntimeFuture } from "./runtime-future";
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
    const mailboxQueue = this.#mailboxes.get(messageKey);

    if (!mailboxQueue || readonlyArray.isEmpty(mailboxQueue)) {
      return option.none;
    }

    const value = mailboxQueue.shift() as Value;

    return option.some(value);
  }

  public receive(process: RuntimeProcess, messageKey: MessageKey<unknown>): void {
    process.receive(messageKey);

    this.#registerReceiver(messageKey, process);
  }

  public spawn<Relic>(worker: Ritual<Relic>, descriptor: ProcessDescriptor): RuntimeProcess<Relic> {
    const spawnedProcess = new RuntimeProcess<Relic>(this.#ref, worker, descriptor);

    this.#registerOwnedProcess(spawnedProcess);

    return spawnedProcess;
  }

  public createFuture<Result>(): RuntimeFuture<Result> {
    const future = RuntimeFuture.create<Result>();

    this.#derivedFutures.add(future);

    return future;
  }

  public get ref(): ScopeRef<unknown> {
    return this.#ref;
  }

  public get descriptor(): ScopeDescriptor {
    return this.#descriptor;
  }

  public get status(): RuntimeScopeStatus {
    return this.#state.tag;
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

  public get exitFuture(): RuntimeFuture<unknown> {
    return this.#exitFuture;
  }

  public get entryProcess(): RuntimeProcess {
    return this.#entryProcess;
  }

  public observe(observer: RuntimeScopeObserver): Unsubscribe {
    this.#observers.add(observer);

    return () => {
      this.#observers.delete(observer);
    };
  }

  public cancel(): void {
    this.#enterCanceling();
  }

  private constructor(
    entry: Ritual<unknown>,
    descriptor: ScopeDescriptor,
    parent: RuntimeScope,
    zone: RuntimeZone,
  ) {
    this.#exitFuture = RuntimeFuture.create<unknown>();
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
    this.#observeChildScope(scope);
  }

  #registerOwnedProcess(process: RuntimeProcess): void {
    this.#processContainerFor(process).add(process);
    this.#observeOwnedProcess(process);
  }

  // oxlint-disable-next-line max-lines-per-function
  #observeChildScope(scope: RuntimeScope): void {
    scope.observe(() =>
      match([this.status, scope.status])
        .with(["running", P.union("completed", "failed", "canceled")], () => {
          this.#unregisterChildScope(scope);

          this.#tryClosing();
        })
        .with(["closing", P.union("completed", "canceled", "failed")], () => {
          this.#unregisterChildScope(scope);

          this.#tryCompleted();
        })
        .with(["canceling", P.union("completed", "canceled", "failed")], () => {
          this.#unregisterChildScope(scope);

          this.#tryCanceled();
        })
        .with(["failing", P.union("completed", "canceled")], ([status]) => {
          this.#unregisterChildScope(scope);

          const state = this.#stateAs(status);
          this.#tryFailed(state.draft);
        })
        .with(["failing", "failed"], ([status, scopeStatus]) => {
          this.#unregisterChildScope(scope);

          const state = this.#stateAs(status);
          state.draft.collect(scope.#stateAs(scopeStatus).failure);
          this.#tryFailed(state.draft);
        })
        .with([P.union("running", "closing", "canceling"), "failing"], () => {
          if (scope.descriptor.failureMode === "propagate") {
            this.#enterFailing(
              new ScopeFailureDraft(
                { kind: "scope", scope: scope.ref },
                () => scope.#stateAs("failed").failure,
              ),
            );
          }
        })
        .with(["failing", "failing"], ([status]) => {
          if (scope.descriptor.failureMode === "propagate") {
            this.#enterFailing(this.#stateAs(status).draft);
          }
        })
        .with([P.union("completed", "canceled", "failed"), P._], unreachable)
        .with([P._, P.union("running", "closing", "canceling")], io.Do)
        .exhaustive(),
    );
  }

  #observeOwnedProcess(process: RuntimeProcess): void {
    process.observe(() => {
      this.#zone.trackProcess(process);

      match([this.status, process.status])
        .with(["running", "completed"], () => {
          this.#unregisterOwnedProcess(process);

          this.#tryClosing();
        })
        .with(["running", "canceled"], unreachable)
        .with(["closing", P.union("completed", "canceled")], () => {
          this.#unregisterOwnedProcess(process);

          this.#tryCompleted();
        })
        .with(["canceling", P.union("completed", "canceled")], () => {
          this.#unregisterOwnedProcess(process);

          this.#tryCanceled();
        })
        .with(["failing", P.union("completed", "canceled")], ([status]) => {
          this.#unregisterOwnedProcess(process);

          const state = this.#stateAs(status);
          this.#tryFailed(state.draft);
        })
        .with([P.union("running", "closing", "canceling"), "failed"], () => {
          this.#unregisterOwnedProcess(process);

          this.#enterFailing(
            new ScopeFailureDraft({ kind: "process", process: process.ref }, () =>
              failureOfProcess(process),
            ),
          );
        })
        .with(["failing", "failed"], ([status]) => {
          this.#unregisterOwnedProcess(process);

          const state = this.#stateAs(status);
          state.draft.collect(failureOfProcess(process));
          this.#enterFailing(state.draft);
        })
        .with([P.union("completed", "canceled", "failed"), P._], unreachable)
        .with([P._, P.union("running", "waiting")], io.Do)
        .exhaustive();
    });
  }

  #tryClosing(): void {
    if (this.#isQuiet()) {
      this.#enterClosing();
    }
  }

  #enterClosing(): void {
    this.#transitionTo({ tag: "closing" });
    this.#cancelDetachedProcesses();
    this.#tryCompleted();
  }

  #tryCompleted(): void {
    if (this.#isIdle()) {
      this.exitFuture.settle(either.right(resultOfProcess(this.#entryProcess)));
      this.#transitionTo({ tag: "completed" });
    }
  }

  #enterCanceling(): void {
    this.#transitionTo({ tag: "canceling" });
    const cleanups = this.#cancelManaged();
    this.#spawnCleanups(cleanups);
    this.#tryCanceled();
  }

  #tryCanceled(): void {
    if (this.#isIdle()) {
      this.exitFuture.settle(either.left(canceledFailure()));
      this.#transitionTo({ tag: "canceled" });
    }
  }

  #enterFailing(draft: ScopeFailureDraft): void {
    this.#transitionTo({ draft, tag: "failing" });
    const cleanups = this.#cancelManaged();
    this.#spawnCleanups(cleanups);
    this.#tryFailed(draft);
  }

  #tryFailed(draft: ScopeFailureDraft): void {
    if (this.#isIdle()) {
      const failure = draft.build();
      this.exitFuture.settle(either.left(failure));
      this.#transitionTo({
        failure,
        tag: "failed",
      });
    }
  }

  #acceptMessage<Value>(messageKey: MessageKey<Value>, value: Value): void {
    if (this.#deliverToReceiver(messageKey, value)) {
      return;
    }

    this.#bufferMessage(messageKey, value);
  }

  #unregisterChildScope(scope: RuntimeScope): void {
    this.#children.delete(scope);
  }

  #unregisterOwnedProcess(process: RuntimeProcess): void {
    if (process.completionMode === "structural") {
      this.#structuralProcesses.delete(process);
    } else {
      this.#detachedProcesses.delete(process);
    }
  }

  #deliverToReceiver<Value>(messageKey: MessageKey<Value>, value: Value): boolean {
    const process = this.#receiverQueues.get(messageKey)?.shift();

    if (process) {
      process.accept(value);

      return true;
    }
    return false;
  }

  #bufferMessage<Value>(messageKey: MessageKey<Value>, value: Value): void {
    const mailboxQueue = this.#mailboxes.get(messageKey);

    if (mailboxQueue) {
      mailboxQueue.push(value);
    } else {
      this.#mailboxes.set(messageKey, [value]);
    }
  }

  #registerReceiver(messageKey: MessageKey<unknown>, process: RuntimeProcess): void {
    const receiveQueue = this.#receiverQueues.get(messageKey);

    if (receiveQueue) {
      receiveQueue.push(process);
    } else {
      this.#receiverQueues.set(messageKey, [process]);
    }
  }

  #processContainerFor(process: RuntimeProcess): Set<RuntimeProcess> {
    if (process.descriptor.completionMode === "structural") {
      return this.#structuralProcesses;
    }
    return this.#detachedProcesses;
  }

  #cancelManaged(): Ritual<void>[] {
    const failure = either.left(canceledFailure());
    const cleanups: Ritual<void>[] = [];

    for (const future of this.#derivedFutures) {
      future.settle(failure);
    }

    cleanups.push(...this.#cancelDetachedProcesses());

    for (const process of this.#structuralProcesses) {
      cleanups.push(...process.cancel());
    }

    for (const child of this.#children) {
      child.cancel();
    }

    return cleanups;
  }

  #cancelDetachedProcesses(): Ritual<void>[] {
    const cleanups: Ritual<void>[] = [];

    for (const process of this.#detachedProcesses) {
      cleanups.push(...process.cancel());
    }

    return cleanups;
  }

  #spawnCleanups(cleanups: readonly Ritual<void>[]): void {
    for (const cleanup of cleanups) {
      this.spawn(cleanup, { completionMode: "structural" });
    }
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
  }

  #stateAs<Tag extends RuntimeScopeState["tag"]>(
    tag: Tag,
  ): Extract<RuntimeScopeState, { readonly tag: Tag }> {
    // oxlint-disable-next-line no-void
    void tag;
    return this.#state as Extract<RuntimeScopeState, { readonly tag: Tag }>;
  }

  #notifyObservers(): void {
    for (const observer of this.#observers) {
      observer();
    }
  }

  static readonly #sentinel = null as unknown as RuntimeScope;

  readonly #exitFuture: RuntimeFuture<unknown>;
  readonly #ref: ScopeRef<unknown>;
  readonly #entryProcess: RuntimeProcess;
  readonly #parent: RuntimeScope;
  readonly #descriptor: ScopeDescriptor;
  readonly #zone: RuntimeZone;

  #state: RuntimeScopeState = { tag: "running" };
  readonly #children = new Set<RuntimeScope>();
  readonly #observers = new Set<RuntimeScopeObserver>();

  readonly #mailboxes = new WeakMap<MessageKey<unknown>, unknown[]>();
  readonly #receiverQueues = new WeakMap<MessageKey<unknown>, RuntimeProcess[]>();

  readonly #derivedFutures = new Set<RuntimeFuture<unknown>>();

  readonly #structuralProcesses = new Set<RuntimeProcess>();
  readonly #detachedProcesses = new Set<RuntimeProcess>();

  readonly #bindings = new Map<ContextKey<unknown>, unknown>();
}

export interface RuntimeZone {
  trackProcess(process: RuntimeProcess): void;
}

export type RuntimeScopeStatus =
  | "running"
  | "closing"
  | "completed"
  | "canceling"
  | "canceled"
  | "failing"
  | "failed";

export type RuntimeScopeObserver = () => void;

type RuntimeScopeState =
  | { readonly tag: "running" }
  | { readonly tag: "closing" }
  | { readonly tag: "completed" }
  | { readonly tag: "canceling" }
  | { readonly tag: "canceled" }
  | RuntimeScopeFailingState
  | RuntimeScopeFailedState;

interface RuntimeScopeFailingState {
  readonly tag: "failing";
  readonly draft: ScopeFailureDraft;
}

interface RuntimeScopeFailedState {
  readonly tag: "failed";
  readonly failure: Failure;
}

function failureOfProcess(process: RuntimeProcess): Failure {
  return (process.result as either.Left<Failure>).left;
}

function resultOfProcess(process: RuntimeProcess): unknown {
  return (process.result as either.Right<unknown>).right;
}
