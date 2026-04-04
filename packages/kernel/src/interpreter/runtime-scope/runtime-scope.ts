// oxlint-disable max-lines
import type {
  CleanupSpawner,
  ProvideRuntimeProcess,
  RuntimeProcessKeeper,
} from "#/interpreter/runtime-process";
import type {
  ContextKey,
  FutureKey,
  FutureResult,
  MessageKey,
  ProcessRef,
  REF_TOKEN,
  ScopeRef,
} from "#/contracts";
import type { ProcessDescriptor, ScopeDescriptor } from "#/sigils";
import { either, io, option, readonlySet } from "fp-ts";
import type { Failure } from "#/failures";
import { RuntimeFuture } from "#/interpreter/runtime-future";
import { RuntimeMailbox } from "./runtime-mailbox";
import { ScopeFailureDraft } from "./scope-failure-draft";
import type { ScopeZone } from "#/interpreter/scope-zone";
import type { TaggedUnion } from "type-fest";
import { canceledFailure } from "#/failures";
import { unreachable } from "#/utils";

export class RuntimeScope implements ScopeRef<unknown> {
  public static root(
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
    this.#advanceClosing();
  }

  public halt(process: RuntimeProcessKeeper, failure: Failure): void {
    const failed = "failed";
    process.transitionTo({ failure, status: failed });
    this.#processContainerFor(process).delete(process);
    this.#zone.trackProcess(process);

    const cleanupTrigger = () => this.#triggerCleanup(process);
    if (this.#state.status === "failing") {
      this.#state.draft.collect(process.stateAs(failed).failure);
      this.#enterFailing(this.#state.draft, cleanupTrigger, {
        propagateFailure: this.#propagatesFailure,
      });
    } else {
      this.#enterFailing(
        new ScopeFailureDraft({ kind: "process", process }, () => process.stateAs(failed).failure),
        cleanupTrigger,
        { propagateFailure: this.#propagatesFailure },
      );
    }
  }

  public cancel(): void {
    if (this.#state.status === "failing") {
      this.#enterFailing(this.#state.draft, io.Do, { propagateFailure: false });
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
    this.#children.add(child);

    zone.trackProcess(child.entryProcess);
    zone.trackScope(child);

    return child;
  }

  public spawn<Relic>(
    provideProcess: ProvideRuntimeProcess,
    descriptor: ProcessDescriptor,
  ): ProcessRef<Relic> {
    const process = provideProcess(this, descriptor);

    this.#processContainerFor(process).add(process);
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

    if (this.#isRoot) {
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

  public forceFailed(failure: Failure): void {
    if (this.#state.status === "failing") {
      this.#state.draft.collect(failure);
      this.#enterFailing(this.#state.draft, io.Do, {
        propagateFailure: this.#propagatesFailure,
      });
    } else {
      this.#enterFailing(
        new ScopeFailureDraft({ kind: "scope", scope: this }, () => failure),
        io.Do,
        {
          propagateFailure: this.#propagatesFailure,
        },
      );
    }

    if (this.#state.status === "failing") {
      this.#enterFailing(this.#state.draft, io.Do, {
        propagateFailure: this.#propagatesFailure,
      });
    }
  }

  public get descriptor(): ScopeDescriptor {
    return this.#descriptor;
  }

  public get entryProcess(): ProcessRef<unknown> {
    return this.#entryProcess;
  }

  public get zone(): ScopeZone {
    return this.#zone;
  }

  public get parent(): RuntimeScope | null {
    return this.#isRoot ? null : this.#parent;
  }

  public get children(): readonly RuntimeScope[] {
    return [...this.#children];
  }

  public get exitFuture(): FutureKey<unknown> {
    return this.#exitFuture;
  }

  public get status(): RuntimeScopeStatus {
    return this.#state.status;
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

    this.#processContainerFor(entryProcess).add(entryProcess);

    this.#entryProcess = entryProcess;
    this.#descriptor = descriptor;
    this.#parent = parent;
  }

  #advanceClosing(): void {
    switch (this.#state.status) {
      case "running":
        this.#tryClosing();
        return;
      case "closing":
        this.#tryCompleted();
        return;
      case "canceling":
        this.#tryCanceled();
        return;
      case "failing":
        this.#tryFailed(this.#state.draft);
        return;
      case "canceled":
      case "completed":
      case "failed":
        return unreachable();
    }
  }

  #tryClosing(): void {
    if (this.#isQuiet) {
      this.#enterClosing();
    }
  }

  #enterClosing(): void {
    using _ = this.#reconcile();
    this.#transitionTo({ status: "closing" });
    this.#tryCompleted();
  }

  #enterCanceling(): void {
    using _ = this.#reconcile();
    this.#transitionTo({ status: "canceling" });
    this.#tryCanceled();
  }

  #enterFailing(draft: ScopeFailureDraft, failingDefer: () => void, control: FailingControl): void {
    using _ = this.#reconcile();
    this.#transitionTo({
      draft,
      status: "failing",
    });
    failingDefer();
    if (control.propagateFailure && this.#parent.#notReconciledFor(isFailing)) {
      this.#parent.#enterFailingByChild(this);
    }
    this.#tryFailed(draft);
  }

  #tryCompleted(): void {
    if (this.#isIdle) {
      const { result } = this.#entryProcess.stateAs("completed");
      this.#transitionTo({ result, status: "completed" });
      if (!this.#isRoot && this.#parent.#notReconciledFor(isAnyStatus)) {
        this.#parent.#advanceClosing();
      }
    }
  }

  #tryCanceled(): void {
    if (this.#isIdle) {
      this.#transitionTo({ status: "canceled" });
      if (!this.#isRoot && this.#parent.#notReconciledFor(isAnyStatus)) {
        this.#parent.#advanceClosing();
      }
    }
  }

  #tryFailed(draft: ScopeFailureDraft): void {
    if (this.#isIdle) {
      this.#transitionTo({
        failure: draft.build(),
        status: "failed",
      });
      if (!this.#isRoot && this.#parent.#notReconciledFor(isAnyStatus)) {
        this.#parent.#advanceClosing();
      }
    }
  }

  #transitionTo(state: RuntimeScopeState): void {
    this.#state = state;
    switch (state.status) {
      case "running":
        return unreachable();
      case "closing":
        this.#cancelDetached();
        break;
      case "canceling":
        this.#cancelManaged();
        break;
      case "failing":
        this.#cancelManaged();
        break;
      case "canceled":
        this.#settleClosed(either.left(canceledFailure));
        break;
      case "completed":
        this.#settleClosed(either.right(state.result));
        break;
      case "failed":
        this.#settleClosed(either.left(state.failure));
        break;
    }

    this.#zone.trackScope(this);
  }

  // oxlint-disable-next-line max-statements
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
      if (child.#notReconciledFor(isCancelingOrFailing)) {
        child.cancel();
      }
    }
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

  #settleClosed(result: FutureResult<unknown>): void {
    if (!this.#isRoot) {
      this.#parent.#removeChild(this);
    }

    const canceled = either.left(canceledFailure);
    for (const future of this.#derivedFutures) {
      future.settle(canceled);
    }

    this.#mailbox.clear();
    this.#exitFuture.settle(result);
  }

  #acceptMessage<Value>(messageKey: MessageKey<Value>, value: Value): void {
    const process = this.#mailbox.send(messageKey, value);

    if (process) {
      process.transitionTo({ input: value, status: "running" });
      this.#zone.trackProcess(process);
    }
  }

  #processContainerFor(process: RuntimeProcessKeeper): Set<RuntimeProcessKeeper> {
    if (process.descriptor.completionMode === "structural") {
      return this.#structuralProcesses;
    }
    return this.#detachedProcesses;
  }

  #triggerCleanup(process: RuntimeProcessKeeper): void {
    const spawn: CleanupSpawner = (prepare) => {
      this.spawn(prepare, { completionMode: "structural" });
    };

    for (const cleanup of process.takeCleanups()) {
      cleanup(spawn);
    }
  }

  #enterFailingByChild(child: RuntimeScope): void {
    using _ = this.#reconcile();
    if (this.#state.status === "failing") {
      this.#enterFailing(this.#state.draft, io.Do, {
        propagateFailure: this.#propagatesFailure,
      });
    } else {
      this.#enterFailing(
        new ScopeFailureDraft(
          { kind: "scope", scope: child },
          () => child.#stateAs("failed").failure,
        ),
        io.Do,
        { propagateFailure: this.#propagatesFailure },
      );
    }
  }

  #removeChild(child: RuntimeScope): void {
    if (
      this.#state.status === "failing" &&
      child.status === "failed" &&
      child.descriptor.failureMode === "propagate"
    ) {
      this.#state.draft.collect(child.#stateAs(child.status).failure);
    }

    this.#children.delete(child);
  }

  #stateAs<Status extends RuntimeScopeStatus>(status: Status): RuntimeScopeStateOf<Status> {
    // oxlint-disable-next-line no-void
    void status;
    return this.#state as RuntimeScopeStateOf<Status>;
  }

  #reconcile(): Disposable {
    const wasReconciling = this.#isReconciling;
    this.#isReconciling = true;
    return {
      [Symbol.dispose]: () => {
        this.#isReconciling = wasReconciling;
      },
    };
  }

  #notReconciledFor(isExpectedStatus: (status: RuntimeScopeStatus) => boolean): boolean {
    return !this.#isReconciling || !isExpectedStatus(this.status);
  }

  get #isQuiet(): boolean {
    return readonlySet.isEmpty(this.#structuralProcesses) && readonlySet.isEmpty(this.#children);
  }

  get #isIdle(): boolean {
    return this.#isQuiet && readonlySet.isEmpty(this.#detachedProcesses);
  }

  get #propagatesFailure(): boolean {
    return this.#descriptor.failureMode === "propagate";
  }

  get #isRoot(): boolean {
    return this.#parent === RuntimeScope.#sentinel;
  }

  static readonly #sentinel = null as unknown as RuntimeScope;

  readonly #exitFuture: RuntimeFuture<unknown>;
  readonly #entryProcess: RuntimeProcessKeeper;
  readonly #parent: RuntimeScope;
  readonly #descriptor: ScopeDescriptor;
  readonly #zone: ScopeZone;

  #state: RuntimeScopeState = { status: "running" };
  #isReconciling = false;
  readonly #children = new Set<RuntimeScope>();
  readonly #mailbox = new RuntimeMailbox<RuntimeProcessKeeper>();

  readonly #derivedFutures = new Set<RuntimeFuture<unknown>>();

  readonly #structuralProcesses = new Set<RuntimeProcessKeeper>();
  readonly #detachedProcesses = new Set<RuntimeProcessKeeper>();

  readonly #bindings = new Map<ContextKey<unknown>, unknown>();
}

export type RuntimeScopeStatus = RuntimeScopeState["status"];

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

interface FailingControl {
  readonly propagateFailure: boolean;
}

function isFailing(status: RuntimeScopeStatus): boolean {
  return status === "failing";
}

function isAnyStatus(_status: RuntimeScopeStatus): boolean {
  return true;
}

function isCancelingOrFailing(status: RuntimeScopeStatus): boolean {
  return status === "canceling" || status === "failing";
}
