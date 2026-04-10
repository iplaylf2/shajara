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
  Suppressor,
} from "#/contracts";
import type { ProcessDescriptor, ScopeDescriptor } from "#/sigils";
import { either, option, readonlySet } from "fp-ts";
import { iife, noop, unreachable } from "#/utils";
import type { Failure } from "#/failures";
import type { FutureNotification } from "#/interpreter/runtime-future";
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
    suppressor: Suppressor,
  ): RuntimeScope {
    const scope = new RuntimeScope(entry, descriptor, RuntimeScope.#sentinel, zone);
    zone.trackProcess(scope.entryProcess, suppressor);
    return scope;
  }

  public complete(process: RuntimeProcessKeeper, result: unknown, suppressor: Suppressor): void {
    const closure = process.complete(result);
    this.#processContainerFor(process).delete(process);
    this.#triggerCleanup(closure.cleanups, suppressor);
    this.#zone.trackProcess(process, suppressor);
    this.#advanceClosing([closure.notification], suppressor);
  }

  // oxlint-disable-next-line max-statements
  public halt(process: RuntimeProcessKeeper, failure: Failure, suppressor: Suppressor): void {
    const failed = "failed";
    const closure = process.fail(failure);
    this.#processContainerFor(process).delete(process);
    const cleanupTrigger = () => this.#triggerCleanup(closure.cleanups, suppressor);
    this.#zone.trackProcess(process, suppressor);

    const notifications = [closure.notification];
    const state = this.#state;
    if (state.status === "failing") {
      iife(() => {
        state.draft.capture(process.stateAs(failed).failure);
        this.#enterFailing(
          state.draft,
          cleanupTrigger,
          notifications,
          { propagateFailure: this.#propagatesFailure },
          suppressor,
        );
      });
      return;
    }

    this.#enterFailing(
      new ScopeFailureDraft({ kind: "process", process }, () => process.stateAs(failed).failure),
      cleanupTrigger,
      notifications,
      { propagateFailure: this.#propagatesFailure },
      suppressor,
    );
  }

  public cancel(suppressor: Suppressor): void {
    if (this.#state.status === "failing") {
      this.#enterFailing(this.#state.draft, noop, [], { propagateFailure: false }, suppressor);
    } else {
      this.#enterCanceling(suppressor);
    }
  }

  public branch(
    entry: ProvideRuntimeProcess,
    descriptor: ScopeDescriptor,
    zone: ScopeZone,
    suppressor: Suppressor,
  ): RuntimeScope {
    const child = new RuntimeScope(entry, descriptor, this, zone);
    this.#children.add(child);
    zone.trackProcess(child.entryProcess, suppressor);
    zone.trackScope(child, suppressor);

    return child;
  }

  public spawn<Relic>(
    provideProcess: ProvideRuntimeProcess,
    descriptor: ProcessDescriptor,
    suppressor: Suppressor,
  ): ProcessRef<Relic> {
    const process = provideProcess(this, descriptor);

    this.#processContainerFor(process).add(process);
    this.#zone.trackProcess(process, suppressor);

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

  public wait(
    process: RuntimeProcessKeeper,
    future: RuntimeFuture<unknown>,
    suppressor: Suppressor,
  ): void {
    const unsubscribe = future.wait((result, suppressor2) => {
      process.resume(result);
      this.#zone.trackProcess(process, suppressor2);
    });

    process.wait(unsubscribe);
    this.#zone.trackProcess(process, suppressor);
  }

  // oxlint-disable-next-line class-methods-use-this
  public send<Value>(
    targetScope: RuntimeScope,
    messageKey: MessageKey<Value>,
    value: Value,
    suppressor: Suppressor,
  ): void {
    targetScope.#acceptMessage(messageKey, value, suppressor);
  }

  public receive(
    process: RuntimeProcessKeeper,
    messageKey: MessageKey<unknown>,
    suppressor: Suppressor,
  ): void {
    this.#mailbox.enqueueReceiver(process, messageKey);

    process.wait(() => {
      this.#mailbox.cancelReceiver(process);
    });
    this.#zone.trackProcess(process, suppressor);
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

  public forceFailed(failure: Failure, suppressor: Suppressor): void {
    const draft = new ScopeFailureDraft({ kind: "scope", scope: this }, () => failure);
    if (this.#state.status === "failing") {
      draft.capture(this.#state.draft.build());
    }

    this.#enterFailing(draft, noop, [], { propagateFailure: this.#propagatesFailure }, suppressor);

    while (this.#state.status === "failing") {
      this.#enterFailing(this.#state.draft, noop, [], { propagateFailure: false }, suppressor);
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

  #advanceClosing(notifications: FutureNotification[], suppressor: Suppressor): void {
    switch (this.#state.status) {
      case "running":
        this.#tryClosing(notifications, suppressor);
        return;
      case "closing":
        this.#tryCompleted(notifications, suppressor);
        return;
      case "canceling":
        this.#tryCanceled(notifications, suppressor);
        return;
      case "failing":
        this.#tryFailed(this.#state.draft, notifications, suppressor);
        return;
      case "canceled":
      case "completed":
      case "failed":
        return unreachable();
    }
  }

  #tryClosing(notifications: FutureNotification[], suppressor: Suppressor): void {
    if (this.#isQuiet) {
      this.#enterClosing(notifications, suppressor);
      return;
    }

    flushNotifications(notifications, suppressor);
  }

  #enterClosing(notifications: FutureNotification[], suppressor: Suppressor): void {
    using _ = this.#reconcile();

    this.#transitionTo({ status: "closing" }, notifications, suppressor);
    this.#tryCompleted([], suppressor);
  }

  #enterCanceling(suppressor: Suppressor): void {
    using _ = this.#reconcile();

    this.#transitionTo({ status: "canceling" }, [], suppressor);
    this.#tryCanceled([], suppressor);
  }

  // oxlint-disable-next-line max-params
  #enterFailing(
    draft: ScopeFailureDraft,
    failingDefer: () => void,
    notifications: FutureNotification[],
    control: FailingControl,
    suppressor: Suppressor,
  ): void {
    using _ = this.#reconcile();

    this.#transitionTo({ draft, status: "failing" }, notifications, suppressor);
    failingDefer();
    if (control.propagateFailure && this.#parent.#notReconciledFor(isFailing)) {
      this.#parent.#enterFailingByChild(this, suppressor);
    }
    this.#tryFailed(draft, [], suppressor);
  }

  #tryCompleted(notifications: FutureNotification[], suppressor: Suppressor): void {
    if (this.#isIdle) {
      const { result } = this.#entryProcess.stateAs("completed");
      this.#transitionTo({ result, status: "completed" }, notifications, suppressor);
      if (!this.#isRoot && this.#parent.#notReconciledFor(isAnyStatus)) {
        this.#parent.#advanceClosing([], suppressor);
      }
      return;
    }

    flushNotifications(notifications, suppressor);
  }

  #tryCanceled(notifications: FutureNotification[], suppressor: Suppressor): void {
    if (this.#isIdle) {
      this.#transitionTo({ status: "canceled" }, notifications, suppressor);
      if (!this.#isRoot && this.#parent.#notReconciledFor(isAnyStatus)) {
        this.#parent.#advanceClosing([], suppressor);
      }
      return;
    }

    flushNotifications(notifications, suppressor);
  }

  #tryFailed(
    draft: ScopeFailureDraft,
    notifications: FutureNotification[],
    suppressor: Suppressor,
  ): void {
    if (this.#isIdle) {
      this.#transitionTo({ failure: draft.build(), status: "failed" }, notifications, suppressor);
      if (!this.#isRoot && this.#parent.#notReconciledFor(isAnyStatus)) {
        this.#parent.#advanceClosing([], suppressor);
      }
      return;
    }

    flushNotifications(notifications, suppressor);
  }

  #transitionTo(
    state: RuntimeScopeState,
    notifications: FutureNotification[],
    suppressor: Suppressor,
  ): void {
    this.#state = state;
    switch (state.status) {
      case "running":
        return unreachable();
      case "closing": {
        notifications.push(...this.#cancelDetached(suppressor));
        break;
      }
      case "canceling":
      case "failing": {
        notifications.push(...this.#cancelManaged(suppressor));
        break;
      }
      case "canceled":
        notifications.push(...this.#settleClosed(either.left(canceledFailure)));
        break;
      case "completed":
        notifications.push(...this.#settleClosed(either.right(state.result)));
        break;
      case "failed":
        notifications.push(...this.#settleClosed(either.left(state.failure)));
        break;
    }

    flushNotifications(notifications, suppressor);

    this.#zone.trackScope(this, suppressor);
  }

  // oxlint-disable-next-line max-statements
  #cancelManaged(suppressor: Suppressor): FutureNotification[] {
    const processes = [...this.#structuralProcesses, ...this.#detachedProcesses];
    const children = [...this.#children];

    this.#structuralProcesses.clear();
    this.#detachedProcesses.clear();

    const notifications: FutureNotification[] = [];
    for (const process of processes) {
      const closure = process.cancel();
      this.#triggerCleanup(closure.cleanups, suppressor);
      this.#zone.trackProcess(process, suppressor);

      notifications.push(closure.notification);
    }

    for (const child of children) {
      if (child.#notReconciledFor(isCancelingOrFailing)) {
        child.cancel(suppressor);
      }
    }

    return notifications;
  }

  #cancelDetached(suppressor: Suppressor): FutureNotification[] {
    const processes = [...this.#detachedProcesses];
    this.#detachedProcesses.clear();
    const notifications: FutureNotification[] = [];

    for (const process of processes) {
      const closure = process.cancel();
      this.#triggerCleanup(closure.cleanups, suppressor);
      this.#zone.trackProcess(process, suppressor);

      notifications.push(closure.notification);
    }

    return notifications;
  }

  #settleClosed(result: FutureResult<unknown>): FutureNotification[] {
    if (!this.#isRoot) {
      this.#parent.#removeChild(this);
    }

    this.#mailbox.clear();

    const canceled = either.left(canceledFailure);
    return [
      ...Array.from(this.#derivedFutures, (future) => future.settle(canceled)),
      this.#exitFuture.settle(result),
    ];
  }

  #acceptMessage<Value>(messageKey: MessageKey<Value>, value: Value, suppressor: Suppressor): void {
    const process = this.#mailbox.send(messageKey, value);

    if (process) {
      process.resume(value);
      this.#zone.trackProcess(process, suppressor);
    }
  }

  #processContainerFor(process: RuntimeProcessKeeper): Set<RuntimeProcessKeeper> {
    if (process.descriptor.completionMode === "structural") {
      return this.#structuralProcesses;
    }
    return this.#detachedProcesses;
  }

  #triggerCleanup(cleanups: readonly CleanupTask[], suppressor: Suppressor): void {
    const spawn: CleanupSpawner = (prepare) => {
      this.spawn(prepare, { completionMode: "structural" }, suppressor);
    };

    for (const cleanup of cleanups) {
      cleanup(spawn);
    }
  }

  #enterFailingByChild(child: RuntimeScope, suppressor: Suppressor): void {
    if (this.#state.status === "failing") {
      this.#enterFailing(
        this.#state.draft,
        noop,
        [],
        { propagateFailure: this.#propagatesFailure },
        suppressor,
      );
      return;
    }

    this.#enterFailing(
      new ScopeFailureDraft(
        { kind: "scope", scope: child },
        () => child.#stateAs("failed").failure,
      ),
      noop,
      [],
      { propagateFailure: this.#propagatesFailure },
      suppressor,
    );
  }

  #removeChild(child: RuntimeScope): void {
    if (
      this.#state.status === "failing" &&
      child.status === "failed" &&
      child.descriptor.failureMode === "propagate"
    ) {
      this.#state.draft.capture(child.#stateAs(child.status).failure);
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

function flushNotifications(notifications: FutureNotification[], suppressor: Suppressor): void {
  for (const notification of notifications) {
    notification(suppressor);
  }
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
