// oxlint-disable class-methods-use-this, max-lines
import type {
  ContextKey,
  MessageKey,
  ProcessDescriptor,
  Ritual,
  ScopeDescriptor,
  ScopeRef,
} from "#src/contracts";
import { P, match } from "ts-pattern";
import { either, option, readonlyArray, readonlySet } from "fp-ts";
import type { Failure } from "#src/failures";
import { RuntimeFuture } from "./runtime-future";
import { RuntimeProcess } from "./runtime-process";
import { ScopeFailureBuilder } from "./scope-failure-builder";
import type { Unsubscribe } from "#src/interpreter-kit";
import { unreachable } from "#src/utils";

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
    return this.#status;
  }

  public get isClosed(): boolean {
    switch (this.#status) {
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
    return this.#process;
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

    this.#process = entryProcess;
    this.#descriptor = descriptor;

    this.#parent = parent;
  }

  #registerChildScope(scope: RuntimeScope) {
    this.#children.add(scope);
    this.#observeChildScope(scope);
  }

  #observeChildScope(scope: RuntimeScope): void {
    scope.observe(() =>
      match([this.status, scope.status])
        .with(["running", P.union("completed", "failed", "canceled")], () => {
          this.#forgetChildScope(scope);
          this.#tryClosing();
        })
        .with(["closing", P.union("completed", "canceled", "failed")], () => {
          this.#forgetChildScope(scope);
          this.#tryComplete();
        })
        .with(["canceling", P.union("completed", "canceled", "failed")], () => {
          this.#forgetChildScope(scope);
          this.#tryCancel();
        })
        .with(["failing", P.union("completed", "canceled")], () => {
          this.#forgetChildScope(scope);
          this.#tryFail();
        })
        .with(["failing", "failed"], () => {
          this.#forgetChildScope(scope);
          this.#suppressScopeFailure(scope);
          this.#tryFail();
        })
        .with([P.union("running", "closing", "canceling", "failing"), "failing"], () => {
          this.#tryFailingByScope(scope);
        })
        .with([P.union("completed", "canceled", "failed"), P._], unreachable)
        .with([P._, P.union("running", "closing", "canceling")], () => {
          // Do nothing
        })
        .exhaustive(),
    );
  }

  #forgetChildScope(scope: RuntimeScope): void {
    this.#children.delete(scope);
  }

  #tryClosing(): void {
    if (this.#hasNoStructuralWork()) {
      this.#enterClosing();
    }
  }

  #enterClosing(): void {
    this.#transitionTo("closing");
    this.#cancelDetachedProcesses();
  }

  #tryComplete(): void {
    if (this.#hasNoTrackedMembers()) {
      this.#transitionTo("completed");
    }
  }

  #tryFailingByScope(scope: RuntimeScope): void {
    if (this.#descriptor.failureMode === "propagate") {
      this.#enterFailingByScope(scope);
    }
  }

  #suppressScopeFailure(scope: RuntimeScope): void {
    this.#scopeFailureBuilder!.suppress(scope.#failure());
  }

  #registerOwnedProcess(process: RuntimeProcess): void {
    this.#processContainerFor(process).add(process);
    this.#observeOwnedProcess(process);
  }

  #observeOwnedProcess(process: RuntimeProcess): void {
    process.observe(() => {
      this.#zone.trackProcess(process);

      match([this.status, process.status])
        .with(["running", "completed"], () => {
          this.#forgetOwnedProcess(process);
          this.#tryClosing();
        })
        .with(["running", "canceled"], unreachable)
        .with(["closing", P.union("completed", "canceled")], () => {
          this.#forgetOwnedProcess(process);
          this.#tryComplete();
        })
        .with(["canceling", P.union("completed", "canceled")], () => {
          this.#forgetOwnedProcess(process);
          this.#tryCancel();
        })
        .with(["failing", P.union("completed", "canceled")], () => {
          this.#forgetOwnedProcess(process);
          this.#tryFail();
        })
        .with([P.union("running", "closing", "canceling", "failing"), "failed"], () => {
          this.#forgetOwnedProcess(process);
          this.#enterFailingByProcess(process);
        })
        .with([P.union("completed", "canceled", "failed"), P._], unreachable)
        .with([P._, P.union("running", "waiting")], () => {
          // Do nothing
        })
        .exhaustive();
    });
  }

  #forgetOwnedProcess(process: RuntimeProcess): void {
    if (process.completionMode === "structural") {
      this.#structuralProcesses.delete(process);
      return;
    }

    this.#detachedProcesses.delete(process);
  }

  #enterCanceling(): void {
    this.#transitionTo("canceling");
    this.#cascadeCancellation();
  }

  #tryCancel(): void {
    if (this.#hasNoTrackedMembers()) {
      this.#transitionTo("canceled");
    }
  }

  #enterFailingByScope(scope: RuntimeScope): void {
    const failure = scope.#failure();

    if (this.#scopeFailureBuilder) {
      this.#scopeFailureBuilder.suppress(failure);
    } else {
      this.#scopeFailureBuilder = ScopeFailureBuilder.fromScope(scope.ref, failure);
    }

    this.#enterFailing();
  }

  #enterFailingByProcess(process: RuntimeProcess): void {
    const failure = RuntimeScope.#failureByProcess(process);

    if (this.#scopeFailureBuilder) {
      this.#scopeFailureBuilder.suppress(failure);
    } else {
      this.#scopeFailureBuilder = ScopeFailureBuilder.fromProcess(process.ref, failure);
    }

    this.#enterFailing();
  }

  #enterFailing(): void {
    this.#transitionTo("failing");
    this.#cascadeCancellation();
  }

  #failure(): Failure {
    return (this.exitFuture.poll() as option.Some<either.Left<Failure>>).value.left;
  }

  static #failureByProcess(process: RuntimeProcess): Failure {
    return (process.result as either.Left<Failure>).left;
  }

  #tryFail(): void {
    if (this.#hasNoTrackedMembers()) {
      if (!this.#scopeFailureBuilder) {
        unreachable();
      }

      this.#transitionTo("failed");
    }
  }

  #acceptMessage<Value>(messageKey: MessageKey<Value>, value: Value): void {
    if (this.#deliverToReceiver(messageKey, value)) {
      return;
    }

    this.#bufferMessage(messageKey, value);
  }

  #deliverToReceiver<Value>(messageKey: MessageKey<Value>, value: Value): boolean {
    const process = this.#receiverQueues.get(messageKey)?.shift();

    if (!process) {
      return false;
    }

    process.accept(value);

    return true;
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

  // Cancel 完，要提取process的cleanup，进行spawn
  #cascadeCancellation(): void {
    this.#cancelDetachedProcesses();

    for (const process of this.#structuralProcesses) {
      process.cancel();
    }

    for (const child of this.#children) {
      child.cancel();
    }
  }

  #cancelDetachedProcesses(): void {
    for (const process of this.#detachedProcesses) {
      process.cancel();
    }
  }

  #hasNoStructuralWork(): boolean {
    return readonlySet.isEmpty(this.#structuralProcesses) && readonlySet.isEmpty(this.#children);
  }

  #hasNoTrackedMembers(): boolean {
    return (
      readonlySet.isEmpty(this.#structuralProcesses) &&
      readonlySet.isEmpty(this.#detachedProcesses) &&
      readonlySet.isEmpty(this.#children)
    );
  }

  #transitionTo(status: RuntimeScopeStatus): void {
    this.#status = status;
    this.#notifyObservers();
  }

  #notifyObservers(): void {
    for (const observer of this.#observers) {
      observer();
    }
  }

  static readonly #sentinel = null as unknown as RuntimeScope;

  readonly #exitFuture: RuntimeFuture<unknown>;
  readonly #ref: ScopeRef<unknown>;
  readonly #process: RuntimeProcess;
  readonly #parent: RuntimeScope;
  readonly #descriptor: ScopeDescriptor;
  readonly #zone: RuntimeZone;

  #status: RuntimeScopeStatus = "running";
  readonly #children = new Set<RuntimeScope>();
  readonly #observers = new Set<RuntimeScopeObserver>();

  readonly #mailboxes = new WeakMap<MessageKey<unknown>, unknown[]>();
  readonly #receiverQueues = new WeakMap<MessageKey<unknown>, RuntimeProcess[]>();

  readonly #derivedFutures = new Set<RuntimeFuture<unknown>>();

  readonly #structuralProcesses = new Set<RuntimeProcess>();
  readonly #detachedProcesses = new Set<RuntimeProcess>();

  readonly #bindings = new Map<ContextKey<unknown>, unknown>();
  #scopeFailureBuilder: ScopeFailureBuilder | null = null;
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
