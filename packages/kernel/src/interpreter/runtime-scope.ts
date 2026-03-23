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
import { option, readonlyArray } from "fp-ts";
import { RuntimeFuture } from "./runtime-future";
import { RuntimeProcess } from "./runtime-process";
import type { Unsubscribe } from "#src/interpreter-kit";
import { notImplemented } from "#src/internal/not-implemented";
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
    notImplemented("RuntimeScope.cancel");
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

  #registerOwnedProcess(process: RuntimeProcess): void {
    this.#processContainerFor(process).add(process);
    this.#observeOwnedProcess(process);
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

  #observeChildScope(scope: RuntimeScope): void {
    scope.observe(() =>
      match([this.status, scope.status])
        .with(["running", P.union("completed", "failed", "canceled")], () => {
          // This 尝试进入 closing。
        })
        .with(["closing", P.union("completed", "canceled", "failed")], () => {
          // This 尝试进入 completed。
        })
        .with(["canceling", P.union("completed", "canceled", "failed")], () => {
          // This 尝试进入 canceled。
        })
        .with(["failing", P.union("completed", "canceled")], () => {
          // This 尝试进入 failed。
        })
        .with(["failing", "failed"], () => {
          // This 搜集 child 的失败；尝试进入 failed。
        })
        .with([P.union("running", "closing", "canceling", "failing"), "failing"], () => {
          // Child scope 传播失败时，this 进入 failing; failing 可以重进
        })
        .with([P.union("completed", "canceled", "failed"), P._], unreachable)
        .with([P._, P.union("running", "closing", "canceling")], () => {
          // Do nothing
        })
        .exhaustive(),
    );
  }

  #observeOwnedProcess(process: RuntimeProcess): void {
    process.observe(() => {
      this.#zone.trackProcess(process);

      match([this.status, process.status])
        .with(["running", "completed"], () => {
          // Scope 尝试进入 closing。
        })
        .with(["running", "canceled"], unreachable)
        .with(["closing", P.union("completed", "canceled")], () => {
          // Scope 尝试进入 completed。
        })
        .with(["canceling", P.union("completed", "canceled")], () => {
          // Scope 尝试进入 canceled。
        })
        .with(["failing", P.union("completed", "canceled")], () => {
          // Scope 尝试进入 failed。
        })
        .with([P.union("running", "closing", "canceling", "failing"), "failed"], () => {
          // Scope 搜集 process 的失败并进入 failing; failing 可以重进
        })
        .with([P.union("completed", "canceled", "failed"), P._], unreachable)
        .with([P._, P.union("running", "waiting")], () => {
          // Do nothing
        })
        .exhaustive();
    });
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
