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
  ProcessDescriptor,
  ProcessRef,
  REF_TOKEN,
  ScopeDescriptor,
  ScopeRef,
  Suppressor,
} from "#/contracts";
import type { OverloadRewrite, ReceiveResult, SendResult } from "#/sigils/index";
import { canceledFailure, channelFailure } from "#/failures";
import { either, option, readonlySet } from "fp-ts";
import type { Failure } from "#/failures";
import type { FutureSettlement } from "#/interpreter/runtime-future";
import { PendingScopeFailure } from "./pending-scope-failure";
import { RuntimeChannel } from "#/interpreter/runtime-channel";
import type { RuntimeChannelHandle } from "#/interpreter/runtime-channel";
import { RuntimeFuture } from "#/interpreter/runtime-future";
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

    yield scope.#trackProcess(scope.entryProcess);
    yield scope.#trackScope(scope);

    return scope;
  }

  public *complete(process: RuntimeProcessKeeper, result: unknown): ScopeSync<void> {
    const closure = process.complete(result);
    this.#processContainerFor(process).delete(process);

    yield this.#defer(closure.settlement);
    yield* this.#triggerCleanup(closure.cleanups);
    yield this.#trackProcess(process);
    yield* this.#advanceClosing();
  }

  public *halt(process: RuntimeProcessKeeper, failure: Failure): ScopeSync<void> {
    const closure = process.fail(failure);
    this.#processContainerFor(process).delete(process);

    yield this.#defer(closure.settlement);
    yield this.#trackProcess(process);

    const runCleanups = () => this.#triggerCleanup(closure.cleanups);
    const state = this.#state;
    if (state.status === "failing") {
      state.failure.suppress(failure);
      yield* this.#enterFailing(state.failure, runCleanups);

      return;
    }

    yield* this.#enterFailing(new PendingScopeFailure(failure), runCleanups);
  }

  public *cancel(): ScopeSync<void> {
    yield* this.#state.status === "failing"
      ? this.#enterFailing(this.#state.failure, noopSync)
      : this.#enterCanceling();
  }

  public *branch(
    entry: ProvideRuntimeProcess,
    descriptor: ScopeDescriptor,
    zone: ScopeZone,
  ): ScopeSync<RuntimeScope> {
    const child = new RuntimeScope(entry, descriptor, this, zone);
    this.#children.add(child);

    yield child.#trackProcess(child.entryProcess);
    yield child.#trackScope(child);

    return child;
  }

  public *spawn<Relic, Descriptor extends ProcessDescriptor>(
    provideProcess: ProvideRuntimeProcess,
    descriptor: Descriptor,
  ): ScopeSync<ProcessRef<Relic, Descriptor>> {
    const process = provideProcess(this, descriptor);

    this.#processContainerFor(process).add(process);

    yield this.#trackProcess(process);

    return process as unknown as ProcessRef<Relic, Descriptor>;
  }

  public *wait(future: RuntimeFuture<unknown>, process: RuntimeProcessKeeper): ScopeSync<void> {
    const discard = future.wait((result, suppressor) => {
      process.resume(result);

      this.scopeZone.trackProcess(process, suppressor);
    });

    process.wait(discard);

    yield this.#trackProcess(process);
  }

  public *tryReceive<Value, Outcome>(
    channelHandle: RuntimeChannelHandle<Value, Outcome>,
  ): ScopeSync<ReceiveResult<Value, Outcome> | null> {
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

  public *receive<Outcome>(
    channelHandle: RuntimeChannelHandle<unknown, Outcome>,
    process: RuntimeProcessKeeper,
  ): ScopeSync<void> {
    const channel = this.#resolve(channelHandle);
    const receiver: RuntimeChannelWaiter = { process, scope: this };
    const discard = channel.enqueueReceiver(receiver);
    process.wait(discard);

    yield this.#trackProcess(process);
  }

  public *trySend<Value, Outcome>(
    channelHandle: RuntimeChannelHandle<Value, Outcome>,
    value: Value,
  ): ScopeSync<SendResult<Outcome> | null> {
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

  public *send<Value, Outcome>(
    channelHandle: RuntimeChannelHandle<Value, Outcome>,
    value: Value,
    process: RuntimeProcessKeeper,
  ): ScopeSync<void> {
    const channel = this.#resolve(channelHandle);
    const sender: RuntimeChannelWaiter = { process, scope: this };
    const discard = channel.enqueueSender(sender, value);
    process.wait(discard);

    yield this.#trackProcess(process);
  }

  public *close<Outcome>(
    channelHandle: RuntimeChannelHandle<unknown, Outcome>,
    outcome: Outcome,
  ): ScopeSync<void> {
    const channel = this.#resolve(channelHandle);
    if (channel.isSealed) {
      return;
    }

    const waiters = channel.close(outcome);
    this.#channels.delete(channel);

    yield* this.#resumeChannelWaiters(waiters, { kind: "closed", outcome });
  }

  public createFuture<Result>(): RuntimeFuture<Result> {
    const future = new RuntimeFuture<Result>();

    this.#derivedFutures.add(future);

    future.wait(() => {
      this.#derivedFutures.delete(future);
    });

    return future;
  }

  public createChannel<Value, Outcome>(
    capacity: number,
    overloadRewrite: OverloadRewrite<Value>,
  ): RuntimeChannelHandle<Value, Outcome> {
    const channel = new RuntimeChannel<RuntimeChannelWaiter, Value, Outcome>(
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
        yield* this.#tryFailed(this.#state.failure);
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
    failure: PendingScopeFailure,
    runCleanups: () => ScopeSync<void>,
  ): ScopeSync<void> {
    yield* this.#transitionTo({ failure, status: "failing" });
    yield* runCleanups();
    yield* this.#tryFailed(failure);
  }

  *#tryCompleted(): ScopeSync<void> {
    if (this.#isIdle) {
      const { result } = this.#entryProcess.stateAs("completed");

      yield* this.#transitionTo({ result, status: "completed" });
      if (!this.#isRoot) {
        yield this.#signal(this.parentScope, () => this.parentScope.#advanceClosing());
      }
    }
  }

  *#tryCanceled(): ScopeSync<void> {
    if (this.#isIdle) {
      yield* this.#transitionTo({ status: "canceled" });
      if (!this.#isRoot) {
        yield this.#signal(this.parentScope, () => this.parentScope.#advanceClosing());
      }
    }
  }

  *#tryFailed(failure: PendingScopeFailure): ScopeSync<void> {
    if (this.#isIdle) {
      yield* this.#transitionTo({ failure: failure.build(), status: "failed" });
      if (!this.#isRoot) {
        yield this.#signal(this.parentScope, () => this.parentScope.#advanceClosing());
      }
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

    yield this.#trackScope(this);
  }

  *#cancelManaged(): ScopeSync<void> {
    const children = [...this.#children];
    const structuralProcesses = [...this.#structuralProcesses];
    const detachedProcesses = [...this.#detachedProcesses];

    this.#structuralProcesses.clear();
    this.#detachedProcesses.clear();

    for (const child of children) {
      yield this.#signal(child, () => child.cancel());
    }

    for (const process of structuralProcesses) {
      yield* this.#cancelProcess(process);
    }

    for (const process of detachedProcesses) {
      yield* this.#cancelProcess(process);
    }
  }

  *#cancelDetached(): ScopeSync<void> {
    const processes = [...this.#detachedProcesses];
    this.#detachedProcesses.clear();

    for (const process of processes) {
      yield* this.#cancelProcess(process);
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
      const settlement = future.settle(canceled);

      yield this.#defer(settlement);
    }

    const settlement = this.#exitFuture.settle(result);

    yield this.#defer(settlement);
  }

  *#cancelProcess(process: RuntimeProcessKeeper): ScopeSync<void> {
    const closure = process.cancel();

    yield this.#defer(closure.settlement);
    yield* this.#triggerCleanup(closure.cleanups);
    yield this.#trackProcess(process);
  }

  *#triggerCleanup(cleanups: readonly CleanupTask[]): ScopeSync<void> {
    const spawn = (prepare: ProvideRuntimeProcess) =>
      this.spawn(prepare, { completionMode: "structural" });

    for (const cleanup of cleanups) {
      yield* cleanup(spawn);
    }
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
    result: ReceiveResult<Value, unknown>,
  ): ScopeSync<void> {
    process.resume(result);

    yield this.#trackProcess(process);
  }

  *#resumeSender(process: RuntimeProcessKeeper, result: SendResult<unknown>): ScopeSync<void> {
    process.resume(result);

    yield this.#trackProcess(process);
  }

  *#revokeChannelWithFailure(channel: AnyRuntimeChannel, cause: unknown): ScopeSync<void> {
    yield* this.#revoke(channel);
    yield* this.#enterFailing(
      new PendingScopeFailure(channelFailure(cause, "Channel operation failed")),
      noopSync,
    );
  }

  *#revoke(channel: RuntimeChannel<RuntimeChannelWaiter, unknown, unknown>): ScopeSync<void> {
    const waiters = channel.revoke();

    this.#channels.delete(channel);

    yield* this.#resumeChannelWaiters(waiters, { kind: "revoked" });
  }

  #trackProcess(process: ProcessRef<unknown>): ScopeSyncEffect {
    return {
      kind: "handoff",
      task: (suppressor: Suppressor) => this.scopeZone.trackProcess(process, suppressor),
    };
  }

  #trackScope(scope: ScopeRef<unknown>): ScopeSyncEffect {
    return {
      kind: "handoff",
      task: (suppressor: Suppressor) => this.scopeZone.trackScope(scope, suppressor),
    };
  }

  // oxlint-disable-next-line class-methods-use-this
  #defer(task: ScopeReleaseTask): ScopeSyncEffect {
    return {
      kind: "defer",
      task,
    };
  }

  // oxlint-disable-next-line class-methods-use-this
  #signal(scope: ScopeRef<unknown>, run: () => ScopeSync<void>): ScopeSyncEffect {
    return {
      kind: "signal",
      run,
      scope,
    };
  }

  #processContainerFor(process: RuntimeProcessKeeper): Set<RuntimeProcessKeeper> {
    if (process.descriptor.completionMode === "structural") {
      return this.#structuralProcesses;
    }
    return this.#detachedProcesses;
  }

  #removeChild(child: RuntimeScope): void {
    this.#children.delete(child);
  }

  // oxlint-disable-next-line class-methods-use-this
  #touch(_token: AnyRuntimeChannel): void {
    // Do nothing
  }

  #resolve<Value, Outcome>(
    token: RuntimeChannelHandle<Value, Outcome>,
  ): RuntimeChannel<RuntimeChannelWaiter, Value, Outcome>;
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

export type ScopeReleaseTask = FutureSettlement;
export type ScopeHandoffTask = (suppressor: Suppressor) => void;

export type RuntimeScopeStatus = RuntimeScopeState["status"];

export type ScopeSyncEffect = TaggedUnion<
  "kind",
  {
    defer: {
      readonly task: ScopeReleaseTask;
    };
    handoff: {
      readonly task: ScopeHandoffTask;
    };
    signal: {
      readonly run: () => ScopeSync<void>;
      readonly scope: ScopeRef<unknown>;
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
    failing: { readonly failure: PendingScopeFailure };
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

// oxlint-disable-next-line no-explicit-any
type AnyRuntimeFuture = RuntimeFuture<any>;
// oxlint-disable-next-line no-explicit-any
type AnyRuntimeChannel = RuntimeChannel<RuntimeChannelWaiter, any, any>;

type ChannelClosedResult =
  | Exclude<ReceiveResult<unknown, unknown>, { readonly kind: "value" }>
  | Exclude<SendResult<unknown>, { readonly kind: "sent" }>;
