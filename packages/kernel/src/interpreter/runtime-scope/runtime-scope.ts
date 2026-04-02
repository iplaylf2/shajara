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
import type { ProcessDescriptor, ScopeDescriptor } from "#/sigils";
import { either, io, option, readonlyArray, readonlySet } from "fp-ts";
import type { Failure } from "#/failures";
import { RuntimeFuture } from "#/interpreter/runtime-future";
import { RuntimeMailbox } from "./runtime-mailbox";
import { ScopeFailureDraft } from "./scope-failure-draft";
import type { ScopeZone } from "#/interpreter/scope-zone";
import type { TaggedUnion } from "type-fest";
import { TransitionQueue } from "./transition-queue";
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
    this.#enqueueMemberClosed({
      closedProcesses: [process],
      failedProcesses: [],
      scopes: [],
    });
    this.#exhaustTransitions();
  }

  public halt(process: RuntimeProcessKeeper, failure: Failure): void {
    process.transitionTo({ failure, status: "failed" });
    this.#processContainerFor(process).delete(process);
    this.#zone.trackProcess(process);
    this.#enqueueMemberClosed({
      closedProcesses: [],
      failedProcesses: [process],
      scopes: [],
    });
    this.#exhaustTransitions();
  }

  public cancel(): void {
    this.#enqueueCancel();
    this.#exhaustTransitions();
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

  public forceFailed(failure: Failure): void {
    this.#enqueueForceFailed(failure);
    this.#exhaustTransitions();
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
    this.#transitions = new TransitionQueue((signal: PendingSignal) => {
      this.#consumeSignal(signal);
    });
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
        if (
          this.#descriptor.failureMode === "propagate" &&
          this.#parent !== RuntimeScope.#sentinel
        ) {
          this.#parent.#enqueueChildFailing(this);
          this.#deferAfterTransition(() => {
            this.#parent.#exhaustTransitions();
          });
        }
        break;
      case "canceled":
        this.#afterClosed();
        this.#exitFuture.settle(either.left(canceledFailure));
        break;
      case "completed":
        this.#afterClosed();
        this.#exitFuture.settle(either.right(state.result));
        break;
      case "failed":
        this.#afterClosed();
        this.#exitFuture.settle(either.left(state.failure));
        break;
    }

    this.#zone.trackScope(this);
  }

  // oxlint-disable-next-line max-statements
  #consumeSignal(signal: PendingSignal): void {
    switch (signal.kind) {
      case "cancel":
        this.#consumeCancel();
        break;
      case "child-failing": {
        const { scope } = signal;
        this.#consumeChildFailing(scope);
        break;
      }
      case "force-failed": {
        const { failure } = signal;
        this.#consumeForceFailed(failure);
        break;
      }
      case "member-closed": {
        const { closedProcesses, failedProcesses, scopes } = signal;
        this.#consumeMemberClosed(closedProcesses, failedProcesses, scopes);
        break;
      }
    }
  }

  #consumeCancel(): void {
    if (this.#state.status === "failing") {
      this.#enterFailing(this.#state.draft, io.Do);
    } else {
      this.#enterCanceling();
    }
  }

  #consumeChildFailing(childScope: RuntimeScope): void {
    if (this.#state.status === "failing") {
      this.#enterFailing(this.#state.draft, io.Do);
    } else {
      this.#enterFailing(
        new ScopeFailureDraft(
          { kind: "scope", scope: childScope },
          () => childScope.#stateAs("failed").failure,
        ),
        io.Do,
      );
    }
  }

  #consumeForceFailed(failure: Failure): void {
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

    if (this.#state.status === "failing") {
      this.#enterFailing(this.#state.draft, io.Do);
    }
  }

  // oxlint-disable-next-line max-lines-per-function, max-statements
  #consumeMemberClosed(
    closedProcesses: RuntimeProcessKeeper[],
    failedProcesses: RuntimeProcessKeeper[],
    children: RuntimeScope[],
  ): void {
    for (const scope of children) {
      this.#children.delete(scope);
    }

    const cleanupsTrigger = () => {
      this.#triggerCleanups([...closedProcesses, ...failedProcesses]);
    };

    if (this.#state.status === "failing") {
      for (const scope of children) {
        if (scope.status === "failed" && scope.descriptor.failureMode === "propagate") {
          this.#state.draft.collect(scope.#stateAs(scope.status).failure);
        }
      }

      if (readonlyArray.isEmpty(failedProcesses)) {
        cleanupsTrigger();
        this.#tryFailed(this.#state.draft);
      } else {
        for (const process of failedProcesses) {
          this.#state.draft.collect(process.stateAs("failed").failure);
        }

        this.#enterFailing(this.#state.draft, cleanupsTrigger);
      }
    } else {
      // oxlint-disable-next-line no-lonely-if
      if (readonlyArray.isEmpty(failedProcesses)) {
        cleanupsTrigger();
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
          default:
            return unreachable();
        }
      } else {
        const [source, ...processes] = failedProcesses;

        const draft = new ScopeFailureDraft(
          { kind: "process", process: source! },
          () => source!.stateAs("failed").failure,
        );

        for (const process of processes) {
          draft.collect(process.stateAs("failed").failure);
        }

        this.#enterFailing(draft, cleanupsTrigger);
      }
    }
  }

  #enterFailing(draft: ScopeFailureDraft, failingDefer: () => void): void {
    this.#transitionTo({ draft, status: "failing" });
    failingDefer();
    this.#tryFailed(draft);
  }

  #enterCanceling(): void {
    this.#transitionTo({ status: "canceling" });
    this.#tryCanceled();
  }

  #enterClosing(): void {
    this.#transitionTo({ status: "closing" });
    this.#tryCompleted();
  }

  #tryFailed(draft: ScopeFailureDraft): void {
    if (this.#isIdle) {
      this.#transitionTo({
        failure: draft.build(),
        status: "failed",
      });
    }
  }

  #tryCanceled(): void {
    if (this.#isIdle) {
      this.#transitionTo({ status: "canceled" });
    }
  }

  #tryCompleted(): void {
    if (this.#isIdle) {
      const { result } = this.#entryProcess.stateAs("completed");
      this.#transitionTo({ result, status: "completed" });
    }
  }

  #tryClosing(): void {
    if (this.#isQuiet) {
      this.#enterClosing();
    }
  }

  #afterClosed(): void {
    const canceled = either.left(canceledFailure);
    for (const future of this.#derivedFutures) {
      future.settle(canceled);
    }

    this.#mailbox.clear();
    this.#transitions.close();

    if (this.#parent !== RuntimeScope.#sentinel) {
      this.#parent.#enqueueMemberClosed({
        closedProcesses: [],
        failedProcesses: [],
        scopes: [this],
      });
      this.#deferAfterTransition(() => {
        this.#parent.#exhaustTransitions();
      });
    }
  }

  // oxlint-disable-next-line max-statements
  #cancelManaged(): void {
    const processes = [...this.#structuralProcesses, ...this.#detachedProcesses];
    const children = [...this.#children];

    this.#structuralProcesses.clear();
    this.#detachedProcesses.clear();
    this.#children.clear();

    for (const process of processes) {
      process.transitionTo({ status: "canceled" });
      this.#zone.trackProcess(process);
      this.#triggerCleanup(process);
    }

    for (const child of children) {
      child.cancel();
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

  #triggerCleanup(process: RuntimeProcessKeeper): void {
    const spawn: CleanupSpawner = (prepare) => {
      this.spawn(prepare, { completionMode: "structural" });
    };

    for (const cleanup of process.takeCleanups()) {
      cleanup(spawn);
    }
  }

  #enqueueMemberClosed({
    closedProcesses,
    failedProcesses,
    scopes,
  }: PendingMemberClosedPayload): void {
    this.#transitions.merge(
      {
        closedProcesses,
        failedProcesses,
        kind: "member-closed",
        scopes,
      },
      (current, next) => {
        const currentMemberClosed = current as PendingMemberClosedSignal;
        const nextMemberClosed = next as PendingMemberClosedSignal;

        currentMemberClosed.closedProcesses.push(...nextMemberClosed.closedProcesses);
        currentMemberClosed.failedProcesses.push(...nextMemberClosed.failedProcesses);
        currentMemberClosed.scopes.push(...nextMemberClosed.scopes);
      },
    );
  }

  #enqueueCancel(): void {
    this.#transitions.append({ kind: "cancel" });
  }

  #enqueueForceFailed(failure: Failure): void {
    this.#transitions.seal({ failure, kind: "force-failed" });
  }

  #enqueueChildFailing(scope: RuntimeScope): void {
    this.#transitions.append({ kind: "child-failing", scope });
  }

  #exhaustTransitions(): void {
    this.#transitions.exhaust(() => {
      this.#flushDeferredAfterTransition();
    });
  }

  #deferAfterTransition(callback: () => void): void {
    this.#afterTransition.push(callback);
  }

  #flushDeferredAfterTransition(): void {
    while (readonlyArray.isNonEmpty(this.#afterTransition)) {
      const callbacks = [...this.#afterTransition];

      for (const callback of callbacks) {
        callback();
      }
    }
  }

  #triggerCleanups(processes: RuntimeProcessKeeper[]): void {
    for (const process of processes) {
      this.#triggerCleanup(process);
    }
  }

  #acceptMessage<Value>(messageKey: MessageKey<Value>, value: Value): void {
    const process = this.#mailbox.send(messageKey, value);

    if (process) {
      process.transitionTo({ input: value, status: "running" });
      this.#zone.trackProcess(process);
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
  readonly #transitions: TransitionQueue<PendingSignal>;

  #state: RuntimeScopeState = { status: "running" };
  readonly #children = new Set<RuntimeScope>();
  readonly #mailbox = new RuntimeMailbox<RuntimeProcessKeeper>();

  readonly #derivedFutures = new Set<RuntimeFuture<unknown>>();

  readonly #structuralProcesses = new Set<RuntimeProcessKeeper>();
  readonly #detachedProcesses = new Set<RuntimeProcessKeeper>();

  readonly #bindings = new Map<ContextKey<unknown>, unknown>();
  readonly #afterTransition: Array<() => void> = [];
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

interface PendingCancelSignal {
  kind: "cancel";
}

interface PendingChildFailingSignal {
  kind: "child-failing";
  scope: RuntimeScope;
}

interface PendingMemberClosedSignal {
  kind: "member-closed";
  closedProcesses: RuntimeProcessKeeper[];
  failedProcesses: RuntimeProcessKeeper[];
  scopes: RuntimeScope[];
}

type PendingMemberClosedPayload = Omit<PendingMemberClosedSignal, "kind">;

interface PendingForcedFailureSignal {
  failure: Failure;
  kind: "force-failed";
}

type PendingSignal =
  | PendingCancelSignal
  | PendingMemberClosedSignal
  | PendingChildFailingSignal
  | PendingForcedFailureSignal;
