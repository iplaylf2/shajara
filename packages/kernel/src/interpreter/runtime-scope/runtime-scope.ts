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
  MessageKey,
  ProcessRef,
  REF_TOKEN,
  ScopeRef,
  Suppressor,
} from "#/contracts";
import type { ProcessDescriptor, ScopeDescriptor } from "#/sigils/index";
import { either, option, readonlySet } from "fp-ts";
import type { Failure } from "#/failures";
import { RuntimeFuture } from "#/interpreter/runtime-future";
import { RuntimeMailbox } from "./runtime-mailbox";
import { ScopeFailureDraft } from "./scope-failure-draft";
import type { ScopeZone } from "#/interpreter/scope-zone";
import type { TaggedUnion } from "type-fest";
import { canceledFailure } from "#/failures";
import { unreachable } from "#/utils/index";

export class RuntimeScope implements ScopeRef<unknown> {
  public static *root(
    entry: ProvideRuntimeProcess,
    descriptor: ScopeDescriptor,
    zone: ScopeZone,
  ): RuntimeSync<RuntimeScope> {
    const scope = new RuntimeScope(entry, descriptor, RuntimeScope.#sentinel, zone);

    yield scope.#trackProcess(scope.entryProcess);
    yield scope.#trackScope(scope);

    return scope;
  }

  public *complete(process: RuntimeProcessKeeper, result: unknown): RuntimeSync<void> {
    const closure = process.complete(result);
    this.#processContainerFor(process).delete(process);

    yield this.#notify(closure.notification);
    yield* this.#triggerCleanup(closure.cleanups);
    yield this.#trackProcess(process);
    yield* this.#advanceClosing();
  }

  public *halt(process: RuntimeProcessKeeper, failure: Failure): RuntimeSync<void> {
    const failed = "failed";
    const closure = process.fail(failure);
    this.#processContainerFor(process).delete(process);

    yield this.#notify(closure.notification);
    yield this.#trackProcess(process);

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

  public *cancel(): RuntimeSync<void> {
    if (this.#state.status === "failing") {
      yield* this.#enterFailing(this.#state.draft, noopSync, { propagateFailure: false });
    } else {
      yield* this.#enterCanceling();
    }
  }

  public *branch(
    entry: ProvideRuntimeProcess,
    descriptor: ScopeDescriptor,
    zone: ScopeZone,
  ): RuntimeSync<RuntimeScope> {
    const child = new RuntimeScope(entry, descriptor, this, zone);
    this.#children.add(child);

    yield child.#trackProcess(child.entryProcess);
    yield child.#trackScope(child);

    return child;
  }

  public *spawn<Relic>(
    provideProcess: ProvideRuntimeProcess,
    descriptor: ProcessDescriptor,
  ): RuntimeSync<ProcessRef<Relic>> {
    const process = provideProcess(this, descriptor);

    this.#processContainerFor(process).add(process);

    yield this.#trackProcess(process);

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

  public *wait(process: RuntimeProcessKeeper, future: RuntimeFuture<unknown>): RuntimeSync<void> {
    const unsubscribe = future.wait((result, suppressor) => {
      process.resume(result);

      this.scopeZone.trackProcess(process, suppressor);
    });

    process.wait(unsubscribe);

    yield this.#trackProcess(process);
  }

  // oxlint-disable-next-line class-methods-use-this
  public *send<Value>(
    targetScope: RuntimeScope,
    messageKey: MessageKey<Value>,
    value: Value,
  ): RuntimeSync<void> {
    yield* targetScope.#acceptMessage(messageKey, value);
  }

  public *receive(
    process: RuntimeProcessKeeper,
    messageKey: MessageKey<unknown>,
  ): RuntimeSync<void> {
    this.#mailbox.enqueueReceiver(process, messageKey);

    process.wait(() => {
      this.#mailbox.cancelReceiver(process);
    });

    yield this.#trackProcess(process);
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

    return this.parentScope.lookup(contextKey);
  }

  public bind<Value>(contextKey: ContextKey<Value>, value: Value): void {
    this.#bindings.set(contextKey, value);
  }

  public unbind(contextKey: ContextKey<unknown>): void {
    this.#bindings.delete(contextKey);
  }

  public *forceFailed(failure: Failure): RuntimeSync<void> {
    const draft = new ScopeFailureDraft({ kind: "scope", scope: this }, () => failure);
    if (this.#state.status === "failing") {
      draft.capture(this.#state.draft.build());
    }

    yield* this.#enterFailing(draft, noopSync, { propagateFailure: this.#propagatesFailure });

    while (this.#state.status === "failing") {
      yield* this.#enterFailing(this.#state.draft, noopSync, { propagateFailure: false });
    }
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

  *#advanceClosing(): RuntimeSync<void> {
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

  *#tryClosing(): RuntimeSync<void> {
    if (this.#isQuiet) {
      yield* this.#enterClosing();
    }
  }

  *#enterClosing(): RuntimeSync<void> {
    yield* this.#transitionTo({ status: "closing" });
    yield* this.#tryCompleted();
  }

  *#enterCanceling(): RuntimeSync<void> {
    yield* this.#transitionTo({ status: "canceling" });
    yield* this.#tryCanceled();
  }

  // oxlint-disable-next-line max-params
  *#enterFailing(
    draft: ScopeFailureDraft,
    failingDefer: () => RuntimeSync<void>,
    control: FailingControl,
  ): RuntimeSync<void> {
    yield* this.#transitionTo({ draft, status: "failing" });
    yield* failingDefer();
    if (control.propagateFailure) {
      yield this.#syncScope(this.parentScope, () => this.parentScope.#enterFailingByChild(this));
    }
  }

  *#tryCompleted(): RuntimeSync<void> {
    if (this.#isIdle) {
      const { result } = this.#entryProcess.stateAs("completed");

      yield* this.#transitionTo({ result, status: "completed" });
      if (!this.#isRoot) {
        yield this.#syncScope(this.parentScope, () => this.parentScope.#advanceClosing());
      }
    }
  }

  *#tryCanceled(): RuntimeSync<void> {
    if (this.#isIdle) {
      yield* this.#transitionTo({ status: "canceled" });
      if (!this.#isRoot) {
        yield this.#syncScope(this.parentScope, () => this.parentScope.#advanceClosing());
      }
    }
  }

  *#tryFailed(draft: ScopeFailureDraft): RuntimeSync<void> {
    if (this.#isIdle) {
      yield* this.#transitionTo({ failure: draft.build(), status: "failed" });
      if (!this.#isRoot) {
        yield this.#syncScope(this.parentScope, () => this.parentScope.#advanceClosing());
      }
    }
  }

  *#transitionTo(state: RuntimeScopeState): RuntimeSync<void> {
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

    yield* this.#afterTransition();
  }

  *#cancelManaged(): RuntimeSync<void> {
    const processes = [...this.#structuralProcesses, ...this.#detachedProcesses];
    const children = [...this.#children];

    this.#structuralProcesses.clear();
    this.#detachedProcesses.clear();

    for (const process of processes) {
      const closure = process.cancel();

      yield this.#notify(closure.notification);
      yield* this.#triggerCleanup(closure.cleanups);
      yield this.#trackProcess(process);
    }

    for (const child of children) {
      yield this.#syncScope(child, () => child.cancel());
    }
  }

  *#cancelDetached(): RuntimeSync<void> {
    const processes = [...this.#detachedProcesses];
    this.#detachedProcesses.clear();

    for (const process of processes) {
      const closure = process.cancel();

      yield this.#notify(closure.notification);
      yield* this.#triggerCleanup(closure.cleanups);
      yield this.#trackProcess(process);
    }
  }

  *#settleClosed(result: FutureResult<unknown>): RuntimeSync<void> {
    if (!this.#isRoot) {
      this.parentScope.#removeChild(this);
    }

    this.#mailbox.clear();

    const canceled = either.left(canceledFailure);

    for (const notification of [
      ...Array.from(this.#derivedFutures, (future) => future.settle(canceled)),
      this.#exitFuture.settle(result),
    ]) {
      yield this.#notify(notification);
    }
  }

  *#acceptMessage<Value>(messageKey: MessageKey<Value>, value: Value): RuntimeSync<void> {
    const process = this.#mailbox.send(messageKey, value);

    if (process) {
      process.resume(value);

      yield this.#trackProcess(process);
    }
  }

  *#triggerCleanup(cleanups: readonly CleanupTask[]): RuntimeSync<void> {
    const spawn = (prepare: ProvideRuntimeProcess) =>
      this.spawn(prepare, { completionMode: "structural" });

    for (const cleanup of cleanups) {
      yield* cleanup(spawn);
    }
  }

  *#enterFailingByChild(child: RuntimeScope): RuntimeSync<void> {
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

  #trackProcess(process: ProcessRef<unknown>): RuntimeSyncStep {
    return {
      kind: "track",
      task: (suppressor: Suppressor) => this.scopeZone.trackProcess(process, suppressor),
    };
  }

  #trackScope(scope: ScopeRef<unknown>): RuntimeSyncStep {
    return {
      kind: "track",
      task: (suppressor: Suppressor) => this.scopeZone.trackScope(scope, suppressor),
    };
  }

  // oxlint-disable-next-line class-methods-use-this
  #notify(notification: RuntimeSyncNotification): RuntimeSyncStep {
    return {
      kind: "notify",
      notification,
    };
  }

  // oxlint-disable-next-line class-methods-use-this
  #syncScope(scope: ScopeRef<unknown>, sync: () => RuntimeSync<void>): RuntimeSyncStep {
    return {
      kind: "sync-scope",
      scope,
      sync,
    };
  }

  *#afterTransition(): RuntimeSync<void> {
    yield { kind: "flush" } satisfies RuntimeSyncStep;
    yield this.#trackScope(this);
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
  readonly #mailbox = new RuntimeMailbox<RuntimeProcessKeeper>();
  readonly #derivedFutures = new Set<RuntimeFuture<unknown>>();
  readonly #structuralProcesses = new Set<RuntimeProcessKeeper>();
  readonly #detachedProcesses = new Set<RuntimeProcessKeeper>();
  readonly #bindings = new Map<ContextKey<unknown>, unknown>();
}

export type RuntimeSync<Result> = Generator<RuntimeSyncStep, Result, void>;

export type RuntimeSyncNotification = (suppressor: Suppressor) => void;
export type RuntimeSyncTrack = (suppressor: Suppressor) => void;

export type RuntimeScopeStatus = RuntimeScopeState["status"];

export type RuntimeSyncStep = TaggedUnion<
  "kind",
  {
    flush: {};
    notify: {
      readonly notification: RuntimeSyncNotification;
    };
    "sync-scope": {
      readonly scope: ScopeRef<unknown>;
      readonly sync: () => RuntimeSync<void>;
    };
    track: {
      readonly task: RuntimeSyncTrack;
    };
  }
>;

function* noopSync(): RuntimeSync<void> {
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

type RuntimeScopeStateOf<Status extends RuntimeScopeStatus> = Extract<
  RuntimeScopeState,
  { readonly status: Status }
>;

interface FailingControl {
  readonly propagateFailure: boolean;
}
