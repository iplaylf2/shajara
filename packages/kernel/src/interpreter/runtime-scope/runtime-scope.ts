// oxlint-disable max-lines
import type {
  CleanupSpawner,
  CleanupTask,
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
import { collapseSuppressed, flushCallbacks, releaseSuppressed, suppressCallbacks } from "#/host";
import { either, option, readonlySet } from "fp-ts";
import { iife, noop, unreachable } from "#/utils";
import type { Failure } from "#/failures";
import { RuntimeFuture } from "#/interpreter/runtime-future";
import { RuntimeMailbox } from "./runtime-mailbox";
import { ScopeFailureDraft } from "./scope-failure-draft";
import type { ScopeZone } from "#/interpreter/scope-zone";
import type { TaggedUnion } from "type-fest";
import { canceledFailure } from "#/failures";

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
    const closure = process.complete(result);
    this.#processContainerFor(process).delete(process);
    this.#triggerCleanup(closure.cleanups);
    const processCompletion = suppressCallbacks("Process completion notifications failed", [
      () => this.#zone.trackProcess(process),
      ...closure.exitCallbacks,
    ]);

    const closing = this.#advanceClosing();

    releaseSuppressed("Out-of-band failures occurred while handling process completion", [
      processCompletion,
      closing,
    ]);
  }

  public halt(process: RuntimeProcessKeeper, failure: Failure): void {
    const failed = "failed";
    const closure = process.fail(failure);
    this.#processContainerFor(process).delete(process);
    const cleanupTrigger = () => this.#triggerCleanup(closure.cleanups);
    const processFailure = suppressCallbacks("Process failure notifications failed", [
      () => this.#zone.trackProcess(process),
      ...closure.exitCallbacks,
    ]);

    const state = this.#state;
    const failing =
      state.status === "failing"
        ? iife(() => {
            state.draft.collect(process.stateAs(failed).failure);
            return this.#enterFailing(state.draft, cleanupTrigger, {
              propagateFailure: this.#propagatesFailure,
            });
          })
        : this.#enterFailing(
            new ScopeFailureDraft(
              { kind: "process", process },
              () => process.stateAs(failed).failure,
            ),
            cleanupTrigger,
            { propagateFailure: this.#propagatesFailure },
          );

    releaseSuppressed("Out-of-band failures occurred while handling process failure", [
      processFailure,
      failing,
    ]);
  }

  public cancel(): void {
    const canceled = this.#cancel();
    releaseSuppressed("Out-of-band failures occurred while handling scope cancellation", [
      canceled,
    ]);
  }

  public branch(
    entry: ProvideRuntimeProcess,
    descriptor: ScopeDescriptor,
    zone: ScopeZone,
  ): RuntimeScope {
    const child = new RuntimeScope(entry, descriptor, this, zone);
    this.#children.add(child);

    flushCallbacks("Scope branch notifications failed", [
      () => zone.trackProcess(child.entryProcess),
      () => zone.trackScope(child),
    ]);

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
      process.resume(result);
      this.#zone.trackProcess(process);
    });

    process.wait(unsubscribe);
    this.#zone.trackProcess(process);
  }

  // oxlint-disable-next-line class-methods-use-this
  public send<Value>(targetScope: RuntimeScope, messageKey: MessageKey<Value>, value: Value): void {
    targetScope.#acceptMessage(messageKey, value);
  }

  public receive(process: RuntimeProcessKeeper, messageKey: MessageKey<unknown>): void {
    this.#mailbox.enqueueReceiver(process, messageKey);

    process.wait(() => {
      this.#mailbox.cancelReceiver(process);
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
    using _ = this.#reconcile();
    const draft = new ScopeFailureDraft({ kind: "scope", scope: this }, () => failure);
    if (this.#state.status === "failing") {
      draft.collect(this.#state.draft.build());
    }

    const firstCancel = this.#cancelManaged();
    const secondCancel = this.#cancelManaged();
    const propagated =
      this.#propagatesFailure && this.#parent.#notReconciledFor(isFailing)
        ? this.#parent.#enterFailingByChild(this)
        : option.none;
    const failed = this.#tryFailed(draft);

    releaseSuppressed("Out-of-band failures occurred while forcing scope failure", [
      firstCancel,
      secondCancel,
      propagated,
      failed,
    ]);
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

  #advanceClosing(): option.Option<unknown> {
    switch (this.#state.status) {
      case "running":
        return this.#tryClosing();
      case "closing":
        return this.#tryCompleted();
      case "canceling":
        return this.#tryCanceled();
      case "failing":
        return this.#tryFailed(this.#state.draft);
      case "canceled":
      case "completed":
      case "failed":
        return unreachable();
    }
  }

  #cancel(): option.Option<unknown> {
    return this.#state.status === "failing"
      ? this.#enterFailing(this.#state.draft, noop, { propagateFailure: false })
      : this.#enterCanceling();
  }

  #tryClosing(): option.Option<unknown> {
    if (this.#isQuiet) {
      return this.#enterClosing();
    }

    return option.none;
  }

  #enterClosing(): option.Option<unknown> {
    using _ = this.#reconcile();
    const transition = this.#transitionTo({ status: "closing" });
    const completed = this.#tryCompleted();
    return collapseSuppressed("Out-of-band failures occurred while handling scope closing", [
      transition,
      completed,
    ]);
  }

  #enterCanceling(): option.Option<unknown> {
    using _ = this.#reconcile();
    const transition = this.#transitionTo({ status: "canceling" });
    const canceled = this.#tryCanceled();
    return collapseSuppressed("Out-of-band failures occurred while handling scope cancellation", [
      transition,
      canceled,
    ]);
  }

  #enterFailing(
    draft: ScopeFailureDraft,
    failingDefer: () => void,
    control: FailingControl,
  ): option.Option<unknown> {
    using _ = this.#reconcile();
    const transition = this.#transitionTo({
      draft,
      status: "failing",
    });
    failingDefer();
    const propagated =
      control.propagateFailure && this.#parent.#notReconciledFor(isFailing)
        ? this.#parent.#enterFailingByChild(this)
        : option.none;
    const failed = this.#tryFailed(draft);
    return collapseSuppressed("Out-of-band failures occurred while handling scope failure", [
      transition,
      propagated,
      failed,
    ]);
  }

  #tryCompleted(): option.Option<unknown> {
    if (this.#isIdle) {
      const { result } = this.#entryProcess.stateAs("completed");
      const transition = this.#transitionTo({ result, status: "completed" });
      const advanced =
        !this.#isRoot && this.#parent.#notReconciledFor(isAnyStatus)
          ? this.#parent.#advanceClosing()
          : option.none;
      return collapseSuppressed("Out-of-band failures occurred while handling scope completion", [
        transition,
        advanced,
      ]);
    }

    return option.none;
  }

  #tryCanceled(): option.Option<unknown> {
    if (this.#isIdle) {
      const transition = this.#transitionTo({ status: "canceled" });
      const advanced =
        !this.#isRoot && this.#parent.#notReconciledFor(isAnyStatus)
          ? this.#parent.#advanceClosing()
          : option.none;
      return collapseSuppressed("Out-of-band failures occurred while handling scope cancellation", [
        transition,
        advanced,
      ]);
    }

    return option.none;
  }

  #tryFailed(draft: ScopeFailureDraft): option.Option<unknown> {
    if (this.#isIdle) {
      const transition = this.#transitionTo({
        failure: draft.build(),
        status: "failed",
      });
      const advanced =
        !this.#isRoot && this.#parent.#notReconciledFor(isAnyStatus)
          ? this.#parent.#advanceClosing()
          : option.none;
      return collapseSuppressed("Out-of-band failures occurred while completing scope failure", [
        transition,
        advanced,
      ]);
    }

    return option.none;
  }

  #transitionTo(state: RuntimeScopeState): option.Option<unknown> {
    this.#state = state;
    const suppressed: option.Option<unknown>[] = [];
    switch (state.status) {
      case "running":
        return unreachable();
      case "closing":
        suppressed.push(this.#cancelDetached());
        break;
      case "canceling":
      case "failing":
        suppressed.push(this.#cancelManaged());
        break;
      case "canceled":
        suppressed.push(this.#settleClosed(either.left(canceledFailure)));
        break;
      case "completed":
        suppressed.push(this.#settleClosed(either.right(state.result)));
        break;
      case "failed":
        suppressed.push(this.#settleClosed(either.left(state.failure)));
        break;
    }

    suppressed.push(
      suppressCallbacks(`Scope ${state.status} notifications failed`, [
        () => this.#zone.trackScope(this),
      ]),
    );

    return collapseSuppressed(
      "Out-of-band failures occurred while handling scope transition",
      suppressed,
    );
  }

  // oxlint-disable-next-line max-statements
  #cancelManaged(): option.Option<unknown> {
    const processes = [...this.#structuralProcesses, ...this.#detachedProcesses];
    const children = [...this.#children];

    this.#structuralProcesses.clear();
    this.#detachedProcesses.clear();

    const suppressed: option.Option<unknown>[] = [];
    for (const process of processes) {
      const closure = process.cancel();
      this.#triggerCleanup(closure.cleanups);
      suppressed.push(
        suppressCallbacks("Process cancellation notifications failed", [
          () => this.#zone.trackProcess(process),
          ...closure.exitCallbacks,
        ]),
      );
    }

    for (const child of children) {
      if (child.#notReconciledFor(isCancelingOrFailing)) {
        suppressed.push(child.#cancel());
      }
    }

    return collapseSuppressed(
      "Out-of-band failures occurred while handling child scope cancellation",
      suppressed,
    );
  }

  #cancelDetached(): option.Option<unknown> {
    const processes = [...this.#detachedProcesses];
    this.#detachedProcesses.clear();
    const suppressed: option.Option<unknown>[] = [];

    for (const process of processes) {
      const closure = process.cancel();
      this.#triggerCleanup(closure.cleanups);
      suppressed.push(
        suppressCallbacks("Process cancellation notifications failed", [
          () => this.#zone.trackProcess(process),
          ...closure.exitCallbacks,
        ]),
      );
    }

    return collapseSuppressed(
      "Out-of-band failures occurred while handling detached process cancellation",
      suppressed,
    );
  }

  #settleClosed(result: FutureResult<unknown>): option.Option<unknown> {
    if (!this.#isRoot) {
      this.#parent.#removeChild(this);
    }

    this.#mailbox.clear();

    const canceled = either.left(canceledFailure);
    return suppressCallbacks("Scope closure notifications failed", [
      // oxlint-disable-next-line no-magic-numbers
      ...Array.from(this.#derivedFutures, (future) => future.settle(canceled)).flat(1),
      ...this.#exitFuture.settle(result),
    ]);
  }

  #acceptMessage<Value>(messageKey: MessageKey<Value>, value: Value): void {
    const process = this.#mailbox.send(messageKey, value);

    if (process) {
      process.resume(value);
      this.#zone.trackProcess(process);
    }
  }

  #processContainerFor(process: RuntimeProcessKeeper): Set<RuntimeProcessKeeper> {
    if (process.descriptor.completionMode === "structural") {
      return this.#structuralProcesses;
    }
    return this.#detachedProcesses;
  }

  #triggerCleanup(cleanups: readonly CleanupTask[]): void {
    const spawn: CleanupSpawner = (prepare) => {
      this.spawn(prepare, { completionMode: "structural" });
    };

    for (const cleanup of cleanups) {
      cleanup(spawn);
    }
  }

  #enterFailingByChild(child: RuntimeScope): option.Option<unknown> {
    if (this.#state.status === "failing") {
      return this.#enterFailing(this.#state.draft, noop, {
        propagateFailure: this.#propagatesFailure,
      });
    }

    return this.#enterFailing(
      new ScopeFailureDraft(
        { kind: "scope", scope: child },
        () => child.#stateAs("failed").failure,
      ),
      noop,
      { propagateFailure: this.#propagatesFailure },
    );
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

  #stateAs<Status extends RuntimeScopeStatus>(_status: Status): RuntimeScopeStateOf<Status> {
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
