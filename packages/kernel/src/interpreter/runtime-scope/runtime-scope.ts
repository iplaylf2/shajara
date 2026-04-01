// oxlint-disable max-lines
import type {
  CleanupSpawner,
  ProvideRuntimeProcess,
  RuntimeProcessKeeper,
} from "#/interpreter/runtime-process";
import type {
  ContextKey,
  FutureKey,
  MessageKey,
  ProcessRef,
  REF_TOKEN,
  ScopeRef,
} from "#/contracts";
import { P, match } from "ts-pattern";
import type { ProcessDescriptor, ScopeDescriptor } from "#/sigils";
import { either, io, option, readonlySet } from "fp-ts";
import type { Disposer } from "#/utils";
import type { Failure } from "#/failures";
import { RuntimeFuture } from "#/interpreter/runtime-future";
import { RuntimeMailbox } from "./runtime-mailbox";
import { ScopeFailureDraft } from "./scope-failure-draft";
import type { ScopeZone } from "#/interpreter/scope-zone";
import type { TaggedUnion } from "type-fest";
import { canceledFailure } from "#/failures";
import { unreachable } from "#/utils";

export class RuntimeScope implements ScopeRef<unknown> {
  public static create(
    entry: ProvideRuntimeProcess,
    descriptor: ScopeDescriptor,
    zone: ScopeZone,
  ): RuntimeScope {
    const scope = new RuntimeScope(entry, descriptor, RuntimeScope.#sentinel, zone);
    zone.trackProcess(scope.entryProcess);
    return scope;
  }

  public complete(process: RuntimeProcessKeeper, result: unknown): void {
    process.transitionTo({ result, status: "completed" });
    this.#processContainerFor(process).delete(process);
    this.#zone.trackProcess(process);
    this.#triggerCleanup(process);

    switch (this.#state.status) {
      case "running":
        this.#tryClosing();
        break;
      case "closing":
        this.#tryCompleted();
        break;
      case "canceling":
        this.#tryCanceled();
        break;
      case "failing": {
        const { draft } = this.#state;
        this.#tryFailed(draft);
        break;
      }
      case "completed":
      case "canceled":
      case "failed":
        unreachable();
    }
  }

  public halt(process: RuntimeProcessKeeper, failure: Failure): void {
    process.transitionTo({ failure, status: "failed" });
    this.#processContainerFor(process).delete(process);
    this.#zone.trackProcess(process);

    const triggerCleanup = () => {
      this.#triggerCleanup(process);
    };

    if (this.#state.status === "failing") {
      const { draft } = this.#state;
      draft.collect(process.stateAs("failed").failure);
      this.#enterFailing(draft, triggerCleanup);
      return;
    }

    this.#enterFailing(
      new ScopeFailureDraft({ kind: "process", process }, () => process.stateAs("failed").failure),
      triggerCleanup,
    );
  }

  public cancel(): void {
    if (this.#state.status === "failing") {
      const { draft } = this.#state;

      this.#enterFailing(draft, io.Do);
    } else {
      this.#enterCanceling();
    }
  }

  public branch(
    entry: ProvideRuntimeProcess,
    descriptor: ScopeDescriptor,
    zone: ScopeZone,
  ): RuntimeScope {
    const child = new RuntimeScope(entry, descriptor, this, zone);

    this.#registerChildScope(child);
    zone.trackProcess(child.entryProcess);

    return child;
  }

  public spawn<Relic>(
    provideProcess: ProvideRuntimeProcess,
    descriptor: ProcessDescriptor,
  ): ProcessRef<Relic> {
    const process = provideProcess(this, descriptor);

    this.#registerOwnedProcess(process);
    this.#zone.trackProcess(process);

    return process as ProcessRef<Relic>;
  }

  public createFuture<Result>(): RuntimeFuture<Result> {
    const future = new RuntimeFuture<Result>();

    this.#derivedFutures.add(future);

    future.wait(() => {
      this.#derivedFutures.delete(future);
    });

    return future;
  }

  public wait(process: RuntimeProcessKeeper, future: RuntimeFuture<unknown>): void {
    const unsubscribe = future.wait((result) => {
      process.transitionTo({ input: result, status: "running" });
      this.#zone.trackProcess(process);
    });

    process.transitionTo({ dispose: unsubscribe, status: "waiting" });
    this.#zone.trackProcess(process);
  }

  // oxlint-disable-next-line class-methods-use-this
  public send<Value>(targetScope: RuntimeScope, messageKey: MessageKey<Value>, value: Value): void {
    targetScope.#acceptMessage(messageKey, value);
  }

  public receive(process: RuntimeProcessKeeper, messageKey: MessageKey<unknown>): void {
    this.#mailbox.enqueueReceiver(process, messageKey);

    process.transitionTo({
      dispose: () => {
        this.#mailbox.cancelReceiver(process);
      },
      status: "waiting",
    });
    this.#zone.trackProcess(process);
  }

  public tryReceive<Value>(messageKey: MessageKey<Value>): option.Option<Value> {
    return this.#mailbox.tryReceive(messageKey);
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

  public forceFailure(failure: Failure): void {
    if (this.#state.status === "failing") {
      const { draft } = this.#state;
      draft.collect(failure);
      this.#enterFailing(draft, io.Do);
    } else {
      this.#enterFailing(
        new ScopeFailureDraft({ kind: "scope", scope: this }, () => failure),
        io.Do,
      );
    }

    // Double enter failing
    if (this.#state.status === "failing") {
      const { draft } = this.#state;
      this.#enterFailing(draft, io.Do);
    }
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

  public get entryProcess(): ProcessRef<unknown> {
    return this.#entryProcess;
  }

  public get zone(): ScopeZone {
    return this.#zone;
  }

  public get exitFuture(): FutureKey<unknown> {
    return this.#exitFuture;
  }

  public get status(): RuntimeScopeStatus {
    return this.#state.status;
  }

  // oxlint-disable-next-line no-undef
  declare public readonly [REF_TOKEN]: ScopeRef<unknown>[typeof REF_TOKEN];

  private constructor(
    entry: ProvideRuntimeProcess,
    descriptor: ScopeDescriptor,
    parent: RuntimeScope,
    zone: ScopeZone,
  ) {
    this.#exitFuture = new RuntimeFuture<unknown>();
    this.#zone = zone;
    const entryProcess = entry(this, { completionMode: "structural" });

    this.#registerOwnedProcess(entryProcess);

    this.#entryProcess = entryProcess;
    this.#descriptor = descriptor;

    this.#parent = parent;
  }

  #tryClosing(): void {
    if (this.#isQuiet) {
      this.#enterClosing();
    }
  }

  #tryCompleted(): void {
    if (this.#isIdle) {
      const { result } = this.#entryProcess.stateAs("completed");
      this.#transitionTo({ result, status: "completed" });
    }
  }

  #tryCanceled(): void {
    if (this.#isIdle) {
      this.#transitionTo({ status: "canceled" });
    }
  }

  #tryFailed(draft: ScopeFailureDraft): void {
    if (this.#isIdle) {
      const failure = draft.build();
      this.#transitionTo({
        failure,
        status: "failed",
      });
    }
  }

  #stateAs<Status extends RuntimeScopeStatus>(status: Status): RuntimeScopeStateOf<Status> {
    // oxlint-disable-next-line no-void
    void status;
    return this.#state as RuntimeScopeStateOf<Status>;
  }

  #processContainerFor(process: RuntimeProcessKeeper): Set<RuntimeProcessKeeper> {
    if (process.descriptor.completionMode === "structural") {
      return this.#structuralProcesses;
    }
    return this.#detachedProcesses;
  }

  #enterFailing(draft: ScopeFailureDraft, failingDefer: () => void): void {
    this.#transitionTo({ draft, status: "failing" });
    failingDefer();
    this.#tryFailed(draft);
  }

  #triggerCleanup(process: RuntimeProcessKeeper): void {
    const spawn: CleanupSpawner = (prepare) => {
      this.spawn(prepare, { completionMode: "structural" });
    };

    for (const cleanup of process.takeCleanups()) {
      cleanup(spawn);
    }
  }

  #enterCanceling(): void {
    this.#transitionTo({ status: "canceling" });
    this.#tryCanceled();
  }

  #registerChildScope(scope: RuntimeScope) {
    this.#children.add(scope);

    scope.#observe(() => {
      if (scope.isClosed) {
        this.#children.delete(scope);
      }

      this.#driveByChildScope(scope);
    });
  }

  #registerOwnedProcess(process: RuntimeProcessKeeper): void {
    const ownedProcesses = this.#processContainerFor(process);

    ownedProcesses.add(process);
  }

  #acceptMessage<Value>(messageKey: MessageKey<Value>, value: Value): void {
    const process = this.#mailbox.send(messageKey, value);

    if (process) {
      process.transitionTo({ input: value, status: "running" });
      this.#zone.trackProcess(process);
    }
  }

  #enterClosing(): void {
    this.#transitionTo({ status: "closing" });
    this.#tryCompleted();
  }

  #observe(observer: RuntimeScopeObserver): Disposer {
    this.#observers.add(observer);

    return () => {
      this.#observers.delete(observer);
    };
  }

  #transitionTo(state: RuntimeScopeState): void {
    this.#state = state;
    switch (state.status) {
      case "closing":
        this.#cancelDetached();
        break;
      case "canceling":
        this.#cancelManaged();
        break;
      case "failing":
        this.#cancelManaged();
        break;
      case "running":
        return unreachable();
      case "canceled":
        this.#exitFuture.settle(either.left(canceledFailure));
        this.#releaseAfterClosed();
        break;
      case "completed":
        this.#exitFuture.settle(either.right(state.result));
        this.#releaseAfterClosed();
        break;
      case "failed":
        this.#exitFuture.settle(either.left(state.failure));
        this.#releaseAfterClosed();
        break;
    }

    const observers = [...this.#observers];

    for (const observer of observers) {
      observer();
    }
  }

  #cancelManaged(): void {
    const processes = [...this.#structuralProcesses, ...this.#detachedProcesses];
    const children = [...this.#children];

    this.#structuralProcesses.clear();
    this.#detachedProcesses.clear();

    for (const process of processes) {
      process.transitionTo({ status: "canceled" });
      this.#zone.trackProcess(process);
      this.#triggerCleanup(process);
    }

    for (const child of children) {
      child.cancel();
    }
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
            { kind: "scope", scope },
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

  #cancelDetached(): void {
    const processes = [...this.#detachedProcesses];
    this.#detachedProcesses.clear();

    for (const process of processes) {
      process.transitionTo({ status: "canceled" });
      this.#zone.trackProcess(process);
      this.#triggerCleanup(process);
    }
  }

  #releaseAfterClosed(): void {
    const canceled = either.left(canceledFailure);
    for (const future of this.#derivedFutures) {
      future.settle(canceled);
    }

    this.#mailbox.clear();
    this.#observers.clear();
  }

  get #isQuiet(): boolean {
    return readonlySet.isEmpty(this.#structuralProcesses) && readonlySet.isEmpty(this.#children);
  }

  get #isIdle(): boolean {
    return this.#isQuiet && readonlySet.isEmpty(this.#detachedProcesses);
  }

  static readonly #sentinel = null as unknown as RuntimeScope;

  readonly #exitFuture: RuntimeFuture<unknown>;
  readonly #entryProcess: RuntimeProcessKeeper;
  readonly #parent: RuntimeScope;
  readonly #descriptor: ScopeDescriptor;
  readonly #zone: ScopeZone;

  #state: RuntimeScopeState = { status: "running" };
  readonly #children = new Set<RuntimeScope>();
  readonly #observers = new Set<RuntimeScopeObserver>();
  readonly #mailbox = new RuntimeMailbox<RuntimeProcessKeeper>();

  readonly #derivedFutures = new Set<RuntimeFuture<unknown>>();

  readonly #structuralProcesses = new Set<RuntimeProcessKeeper>();
  readonly #detachedProcesses = new Set<RuntimeProcessKeeper>();

  readonly #bindings = new Map<ContextKey<unknown>, unknown>();
}

export type RuntimeScopeStatus = RuntimeScopeState["status"];

export type RuntimeScopeObserver = () => void;

type RuntimeScopeState = TaggedUnion<
  "status",
  {
    canceled: {};
    canceling: {};
    closing: {};
    completed: { readonly result: unknown };
    failed: { readonly failure: Failure };
    failing: { readonly draft: ScopeFailureDraft };
    running: {};
  }
>;

type RuntimeScopeStateOf<Status extends RuntimeScopeStatus> = Extract<
  RuntimeScopeState,
  { readonly status: Status }
>;
