// oxlint-disable max-lines
import type {
  CleanupTask,
  ProvideRuntimeProcess,
  RuntimeProcessKeeper,
} from "#/interpreter/runtime-process";
import type {
  ContextKey,
  FutureKey,
  FutureResult,
  ProcessRef,
  REF_TOKEN,
  ScopeRef,
  Suppressor,
} from "#/contracts";
import type {
  OverloadRewrite,
  ProcessDescriptor,
  ReceiveResult,
  ScopeDescriptor,
  SendResult,
} from "#/sigils/index";
import { canceledFailure, channelFailure } from "#/failures";
import { either, option, readonlySet } from "fp-ts";
import type { Failure } from "#/failures";
import { RuntimeChannel } from "#/interpreter/runtime-channel";
import type { RuntimeChannelHandle } from "#/interpreter/runtime-channel";
import { RuntimeFuture } from "#/interpreter/runtime-future";
import { ScopeFailureDraft } from "./scope-failure-draft";
import type { ScopeZone } from "#/interpreter/scope-zone";
import type { TaggedUnion } from "type-fest";
import { unreachable } from "#/utils/index";

export class RuntimeScope implements ScopeRef<unknown> {
  public static *root(
    entry: ProvideRuntimeProcess,
    descriptor: ScopeDescriptor,
    zone: ScopeZone,
  ): ScopeSync<RuntimeScope> {
    const scope = new RuntimeScope(entry, descriptor, RuntimeScope.#sentinel, zone);

    yield scope.#trackProcessEffect(scope.entryProcess);
    yield scope.#trackScopeEffect(scope);

    return scope;
  }

  public *complete(process: RuntimeProcessKeeper, result: unknown): ScopeSync<void> {
    const closure = process.complete(result);
    this.#processContainerFor(process).delete(process);

    yield this.#notifyEffect(closure.notification);
    yield* this.#triggerCleanup(closure.cleanups);
    yield this.#trackProcessEffect(process);
    yield* this.#advanceClosing();
  }

  public *halt(process: RuntimeProcessKeeper, failure: Failure): ScopeSync<void> {
    const failed = "failed";
    const closure = process.fail(failure);
    this.#processContainerFor(process).delete(process);

    yield this.#notifyEffect(closure.notification);
    yield this.#trackProcessEffect(process);

    const cleanupTrigger = () => this.#triggerCleanup(closure.cleanups);
    const state = this.#state;
    if (state.status === "failing") {
      state.draft.capture(process.stateAs(failed).failure);
      yield* this.#enterFailing(state.draft, cleanupTrigger, {
        propagateFailure: this.#propagatesFailure,
      });

      return;
    }

    yield* this.#enterFailing(
      new ScopeFailureDraft({ kind: "process", process }, () => process.stateAs(failed).failure),
      cleanupTrigger,
      { propagateFailure: this.#propagatesFailure },
    );
  }

  public *cancel(): ScopeSync<void> {
    yield* this.#state.status === "failing"
      ? this.#enterFailing(this.#state.draft, noopSync, { propagateFailure: false })
      : this.#enterCanceling();
  }

  public *branch(
    entry: ProvideRuntimeProcess,
    descriptor: ScopeDescriptor,
    zone: ScopeZone,
  ): ScopeSync<RuntimeScope> {
    const child = new RuntimeScope(entry, descriptor, this, zone);
    this.#children.add(child);

    yield child.#trackProcessEffect(child.entryProcess);
    yield child.#trackScopeEffect(child);

    return child;
  }

  public *spawn<Relic>(
    provideProcess: ProvideRuntimeProcess,
    descriptor: ProcessDescriptor,
  ): ScopeSync<ProcessRef<Relic>> {
    const process = provideProcess(this, descriptor);

    this.#processContainerFor(process).add(process);

    yield this.#trackProcessEffect(process);

    return process as ProcessRef<Relic>;
  }

  public *wait(future: RuntimeFuture<unknown>, process: RuntimeProcessKeeper): ScopeSync<void> {
    const discard = future.wait((result, suppressor) => {
      process.resume(result);

      this.scopeZone.trackProcess(process, suppressor);
    });

    process.wait(discard);

    yield this.#trackProcessEffect(process);
  }

  public *tryReceive<Value>(
    channelHandle: RuntimeChannelHandle<Value>,
  ): ScopeSync<ReceiveResult<Value> | null> {
    const channel = this.#resolve(channelHandle);
    const take = channel.tryTake();
    if (!take) {
      return take;
    }

    const { result, sender } = take;

    if (sender) {
      yield* sender.scope.#resumeSender(sender.process, { kind: "sent" });
    }

    return result;
  }

  public *receive(
    channelHandle: RuntimeChannelHandle<unknown>,
    process: RuntimeProcessKeeper,
  ): ScopeSync<void> {
    const channel = this.#resolve(channelHandle);
    const receiver: RuntimeChannelWaiter = { process, scope: this };
    const discard = channel.enqueueReceiver(receiver);
    process.wait(discard);

    yield this.#trackProcessEffect(process);
  }

  public *trySend<Value>(
    channelHandle: RuntimeChannelHandle<Value>,
    value: Value,
  ): ScopeSync<SendResult | null> {
    const channel = this.#resolve(channelHandle);
    const put = channel.tryPut(value);
    if (!put) {
      const rewriteAttempt = channel.tryOverloadRewrite(value);

      if (either.isLeft(rewriteAttempt)) {
        yield* this.#revokeChannelWithFailure(channel, rewriteAttempt.left);

        return { kind: "revoked" };
      }

      const stillOverload = rewriteAttempt.right;
      if (stillOverload) {
        return null;
      }

      while (true) {
        const sender = channel.tryFill();
        if (!sender) {
          break;
        }

        yield* sender.scope.#resumeSender(sender.process, { kind: "sent" });
      }

      return yield* this.trySend(channel, value);
    }

    const { result, receiver } = put;
    if (receiver) {
      yield* receiver.scope.#resumeReceiver(receiver.process, { kind: "value", value });
    }

    return result;
  }

  public *send<Value>(
    channelHandle: RuntimeChannelHandle<Value>,
    value: Value,
    process: RuntimeProcessKeeper,
  ): ScopeSync<void> {
    const channel = this.#resolve(channelHandle);
    const sender: RuntimeChannelWaiter = { process, scope: this };
    const discard = channel.enqueueSender(sender, value);
    process.wait(discard);

    yield this.#trackProcessEffect(process);
  }

  public *close(channelHandle: RuntimeChannelHandle<unknown>): ScopeSync<void> {
    const channel = this.#resolve(channelHandle);
    const waiters = channel.close();
    this.#channels.delete(channel);

    yield* this.#resumeChannelWaiters(waiters, { kind: "closed" });
  }

  public *forceFailed(failure: Failure): ScopeSync<void> {
    const draft = new ScopeFailureDraft({ kind: "scope", scope: this }, () => failure);
    if (this.#state.status === "failing") {
      draft.capture(this.#state.draft.build());
    }

    yield* this.#enterFailing(draft, noopSync, { propagateFailure: this.#propagatesFailure });

    while (this.#state.status === "failing") {
      yield* this.#enterFailing(this.#state.draft, noopSync, { propagateFailure: false });
    }
  }

  public createFuture<Result>(): RuntimeFuture<Result> {
    const future = new RuntimeFuture<Result>();

    this.#derivedFutures.add(future);

    future.wait(() => {
      this.#derivedFutures.delete(future);
    });

    return future;
  }

  public createChannel<Value>(
    capacity: number,
    overloadRewrite: OverloadRewrite<Value>,
  ): RuntimeChannelHandle<Value> {
    const channel = new RuntimeChannel<RuntimeChannelWaiter, Value>(
      capacity,
      overloadRewrite,
      this,
    );
    this.#touch(channel);
    this.#channels.add(channel);

    return channel;
  }

  public lookup<Value>(contextKey: ContextKey<Value>): option.Option<Value> {
    if (this.#bindings.has(contextKey)) {
      return option.some(this.#bindings.get(contextKey) as Value);
    }

    if (this.#isRoot) {
      return option.none;
    }

    return this.parentScope.lookup(contextKey);
  }

  public bind<Value>(contextKey: ContextKey<Value>, value: Value): void {
    this.#bindings.set(contextKey, value);
  }

  public unbind(contextKey: ContextKey<unknown>): void {
    this.#bindings.delete(contextKey);
  }

  public get descriptor(): ScopeDescriptor {
    return this.scopeDescriptor;
  }

  public get entryProcess(): ProcessRef<unknown> {
    return this.#entryProcess;
  }

  public get zone(): ScopeZone {
    return this.scopeZone;
  }

  public get parent(): RuntimeScope | null {
    return this.#isRoot ? null : this.parentScope;
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
      case "failing": {
        return false;
      }
      case "completed":
      case "canceled":
      case "failed": {
        return true;
      }
    }
  }

  // oxlint-disable-next-line no-undef
  declare public readonly [REF_TOKEN]: ScopeRef<unknown>[typeof REF_TOKEN];

  private constructor(
    entry: ProvideRuntimeProcess,
    private readonly scopeDescriptor: ScopeDescriptor,
    private readonly parentScope: RuntimeScope,
    private readonly scopeZone: ScopeZone,
  ) {
    this.#exitFuture = new RuntimeFuture<unknown>();
    const entryProcess = entry(this, { completionMode: "structural" });

    this.#processContainerFor(entryProcess).add(entryProcess);

    this.#entryProcess = entryProcess;
  }

  *#advanceClosing(): ScopeSync<void> {
    switch (this.#state.status) {
      case "running": {
        yield* this.#tryClosing();
        return;
      }
      case "closing": {
        yield* this.#tryCompleted();
        return;
      }
      case "canceling": {
        yield* this.#tryCanceled();
        return;
      }
      case "failing": {
        yield* this.#tryFailed(this.#state.draft);
        return;
      }
      case "canceled":
      case "completed":
      case "failed": {
        return unreachable();
      }
    }
  }

  *#tryClosing(): ScopeSync<void> {
    if (this.#isQuiet) {
      yield* this.#enterClosing();
    } else {
      yield this.#flushEffect();
    }
  }

  *#enterClosing(): ScopeSync<void> {
    yield* this.#transitionTo({ status: "closing" });
    yield* this.#tryCompleted();
  }

  *#enterCanceling(): ScopeSync<void> {
    yield* this.#transitionTo({ status: "canceling" });
    yield* this.#tryCanceled();
  }

  *#enterFailing(
    draft: ScopeFailureDraft,
    failingDefer: () => ScopeSync<void>,
    control: FailingControl,
  ): ScopeSync<void> {
    yield* this.#transitionTo({ draft, status: "failing" });
    yield* failingDefer();
    if (control.propagateFailure) {
      yield this.#syncScopeEffect(this.parentScope, () =>
        this.parentScope.#enterFailingByChild(this),
      );
    }
    yield* this.#tryFailed(draft);
  }

  *#tryCompleted(): ScopeSync<void> {
    if (this.#isIdle) {
      const { result } = this.#entryProcess.stateAs("completed");

      yield* this.#transitionTo({ result, status: "completed" });
      if (!this.#isRoot) {
        yield this.#syncScopeEffect(this.parentScope, () => this.parentScope.#advanceClosing());
      }
    } else {
      yield this.#flushEffect();
    }
  }

  *#tryCanceled(): ScopeSync<void> {
    if (this.#isIdle) {
      yield* this.#transitionTo({ status: "canceled" });
      if (!this.#isRoot) {
        yield this.#syncScopeEffect(this.parentScope, () => this.parentScope.#advanceClosing());
      }
    } else {
      yield this.#flushEffect();
    }
  }

  *#tryFailed(draft: ScopeFailureDraft): ScopeSync<void> {
    if (this.#isIdle) {
      yield* this.#transitionTo({ failure: draft.build(), status: "failed" });
      if (!this.#isRoot) {
        yield this.#syncScopeEffect(this.parentScope, () => this.parentScope.#advanceClosing());
      }
    } else {
      yield this.#flushEffect();
    }
  }

  *#transitionTo(state: RuntimeScopeState): ScopeSync<void> {
    this.#state = state;
    switch (state.status) {
      case "running": {
        return unreachable();
      }
      case "closing": {
        yield* this.#cancelDetached();
        break;
      }
      case "canceling":
      case "failing": {
        yield* this.#cancelManaged();
        break;
      }
      case "canceled": {
        yield* this.#settleClosed(either.left(canceledFailure));
        break;
      }
      case "completed": {
        yield* this.#settleClosed(either.right(state.result));
        break;
      }
      case "failed": {
        yield* this.#settleClosed(either.left(state.failure));
        break;
      }
    }

    yield this.#flushEffect();
    yield this.#trackScopeEffect(this);
  }

  *#cancelManaged(): ScopeSync<void> {
    const processes = [...this.#structuralProcesses, ...this.#detachedProcesses];
    const children = [...this.#children];

    this.#structuralProcesses.clear();
    this.#detachedProcesses.clear();

    for (const process of processes) {
      const closure = process.cancel();

      yield this.#notifyEffect(closure.notification);
      yield* this.#triggerCleanup(closure.cleanups);
      yield this.#trackProcessEffect(process);
    }

    for (const child of children) {
      yield this.#syncScopeEffect(child, () => child.cancel());
    }
  }

  *#cancelDetached(): ScopeSync<void> {
    const processes = [...this.#detachedProcesses];
    this.#detachedProcesses.clear();

    for (const process of processes) {
      const closure = process.cancel();

      yield this.#notifyEffect(closure.notification);
      yield* this.#triggerCleanup(closure.cleanups);
      yield this.#trackProcessEffect(process);
    }
  }

  *#settleClosed(result: FutureResult<unknown>): ScopeSync<void> {
    if (!this.#isRoot) {
      this.parentScope.#removeChild(this);
    }

    for (const channel of this.#channels) {
      yield* this.#revoke(channel);
    }

    const canceled = either.left(canceledFailure);
    for (const future of this.#derivedFutures) {
      const notification = future.settle(canceled);

      yield this.#notifyEffect(notification);
    }

    const notification = this.#exitFuture.settle(result);

    yield this.#notifyEffect(notification);
  }

  *#triggerCleanup(cleanups: readonly CleanupTask[]): ScopeSync<void> {
    const spawn = (prepare: ProvideRuntimeProcess) =>
      this.spawn(prepare, { completionMode: "structural" });

    for (const cleanup of cleanups) {
      yield* cleanup(spawn);
    }
  }

  *#enterFailingByChild(child: RuntimeScope): ScopeSync<void> {
    if (this.#state.status === "failing") {
      yield* this.#enterFailing(this.#state.draft, noopSync, {
        propagateFailure: this.#propagatesFailure,
      });
      return;
    }

    yield* this.#enterFailing(
      new ScopeFailureDraft(
        { kind: "scope", scope: child },
        () => child.#stateAs("failed").failure,
      ),
      noopSync,
      { propagateFailure: this.#propagatesFailure },
    );
  }

  *#revoke(channel: RuntimeChannel<RuntimeChannelWaiter, unknown>): ScopeSync<void> {
    const waiters = channel.revoke();

    this.#channels.delete(channel);

    yield* this.#resumeChannelWaiters(waiters, { kind: "revoked" });
  }

  #trackProcessEffect(process: ProcessRef<unknown>): ScopeSyncEffect {
    return {
      kind: "track",
      task: (suppressor: Suppressor) => this.scopeZone.trackProcess(process, suppressor),
    };
  }

  #trackScopeEffect(scope: ScopeRef<unknown>): ScopeSyncEffect {
    return {
      kind: "track",
      task: (suppressor: Suppressor) => this.scopeZone.trackScope(scope, suppressor),
    };
  }

  // oxlint-disable-next-line class-methods-use-this
  #notifyEffect(notification: ScopeSyncNotification): ScopeSyncEffect {
    return {
      kind: "notify",
      notification,
    };
  }

  // oxlint-disable-next-line class-methods-use-this
  #flushEffect(): ScopeSyncEffect {
    return { kind: "flush" };
  }

  // oxlint-disable-next-line class-methods-use-this
  #syncScopeEffect(scope: ScopeRef<unknown>, sync: () => ScopeSync<void>): ScopeSyncEffect {
    return {
      kind: "syncScope",
      scope,
      sync,
    };
  }

  #processContainerFor(process: RuntimeProcessKeeper): Set<RuntimeProcessKeeper> {
    if (process.descriptor.completionMode === "structural") {
      return this.#structuralProcesses;
    }
    return this.#detachedProcesses;
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

  // oxlint-disable-next-line class-methods-use-this
  *#resumeChannelWaiters(
    waiters: RuntimeChannelWaiters,
    result: ChannelClosedResult,
  ): ScopeSync<void> {
    for (const receiver of waiters.receivers) {
      yield* receiver.scope.#resumeReceiver(receiver.process, result);
    }

    for (const sender of waiters.senders) {
      yield* sender.scope.#resumeSender(sender.process, result);
    }
  }

  *#resumeReceiver<Value>(
    process: RuntimeProcessKeeper,
    result: ReceiveResult<Value>,
  ): ScopeSync<void> {
    process.resume(result);

    yield this.#trackProcessEffect(process);
  }

  *#resumeSender(process: RuntimeProcessKeeper, result: SendResult): ScopeSync<void> {
    process.resume(result);

    yield this.#trackProcessEffect(process);
  }

  *#revokeChannelWithFailure(channel: AnyRuntimeChannel, cause: unknown): ScopeSync<void> {
    yield* this.#revoke(channel);
    yield* this.#enterFailing(
      new ScopeFailureDraft({ kind: "scope", scope: this }, () =>
        channelFailure(cause, "Channel operation failed"),
      ),
      noopSync,
      { propagateFailure: this.#propagatesFailure },
    );
  }

  // oxlint-disable-next-line class-methods-use-this
  #touch(_token: AnyRuntimeChannel): void {
    // Do nothing
  }

  #resolve<Value>(token: RuntimeChannelHandle<Value>): RuntimeChannel<RuntimeChannelWaiter, Value>;
  // oxlint-disable-next-line class-methods-use-this
  #resolve(token: unknown): unknown {
    return token;
  }

  get #isQuiet(): boolean {
    return readonlySet.isEmpty(this.#structuralProcesses) && readonlySet.isEmpty(this.#children);
  }

  get #isIdle(): boolean {
    return this.#isQuiet && readonlySet.isEmpty(this.#detachedProcesses);
  }

  get #propagatesFailure(): boolean {
    return this.scopeDescriptor.failureMode === "propagate";
  }

  get #isRoot(): boolean {
    return this.parentScope === RuntimeScope.#sentinel;
  }

  static readonly #sentinel = null as unknown as RuntimeScope;

  #state: RuntimeScopeState = { status: "running" };
  readonly #exitFuture: RuntimeFuture<unknown>;
  readonly #entryProcess: RuntimeProcessKeeper;
  readonly #children = new Set<RuntimeScope>();
  readonly #structuralProcesses = new Set<RuntimeProcessKeeper>();
  readonly #detachedProcesses = new Set<RuntimeProcessKeeper>();
  readonly #derivedFutures = new Set<AnyRuntimeFuture>();
  readonly #channels = new Set<AnyRuntimeChannel>();
  readonly #bindings = new Map<ContextKey<unknown>, unknown>();
}

export type ScopeSync<Result> = Generator<ScopeSyncEffect, Result, void>;

export type ScopeSyncNotification = (suppressor: Suppressor) => void;
export type ScopeTrackTask = (suppressor: Suppressor) => void;

export type RuntimeScopeStatus = RuntimeScopeState["status"];

// Heterogeneous runtime registries preserve each entry's value type at creation sites.
// oxlint-disable-next-line no-explicit-any
type AnyRuntimeFuture = RuntimeFuture<any>;
// oxlint-disable-next-line no-explicit-any
type AnyRuntimeChannel = RuntimeChannel<RuntimeChannelWaiter, any>;

export type ScopeSyncEffect = TaggedUnion<
  "kind",
  {
    flush: {};
    notify: {
      readonly notification: ScopeSyncNotification;
    };
    syncScope: {
      readonly scope: ScopeRef<unknown>;
      readonly sync: () => ScopeSync<void>;
    };
    track: {
      readonly task: ScopeTrackTask;
    };
  }
>;

function* noopSync(): ScopeSync<void> {
  // Noop
}

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

interface RuntimeChannelWaiter {
  readonly scope: RuntimeScope;
  readonly process: RuntimeProcessKeeper;
}

interface RuntimeChannelWaiters {
  readonly receivers: readonly RuntimeChannelWaiter[];
  readonly senders: readonly RuntimeChannelWaiter[];
}

type ChannelClosedResult =
  | Exclude<ReceiveResult<unknown>, { readonly kind: "value" }>
  | Exclude<SendResult, { readonly kind: "sent" }>;

type RuntimeScopeStateOf<Status extends RuntimeScopeStatus> = Extract<
  RuntimeScopeState,
  { readonly status: Status }
>;

interface FailingControl {
  readonly propagateFailure: boolean;
}
