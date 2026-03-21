// oxlint-disable class-methods-use-this, max-lines
import type {
  ContextKey,
  MessageKey,
  ProcessDescriptor,
  Ritual,
  ScopeDescriptor,
  ScopeRef,
} from "#src/contracts";
import { none, some } from "#src/utils";
import type { Failure } from "#src/failures";
import type { Option } from "#src/utils";
import { RuntimeFuture } from "./runtime-future";
import { RuntimeProcess } from "./runtime-process";
import type { Unsubscribe } from "#src/interpreter-kit";
import { notImplemented } from "#src/internal/not-implemented";

const EMPTY_QUEUE_SIZE = 0;

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

    this.#children.add(child);
    this.#observeChildScope(child);

    return child;
  }

  public lookup<Value>(contextKey: ContextKey<Value>): Option<Value> {
    if (this.#bindings.has(contextKey)) {
      return some(this.#bindings.get(contextKey) as Value);
    }

    if (this.#parent === RuntimeScope.#sentinel) {
      return none;
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

  public tryReceive<Value>(messageKey: MessageKey<Value>): Option<Value> {
    const mailboxQueue = this.#mailboxes.get(messageKey);

    if (!mailboxQueue || mailboxQueue.length === EMPTY_QUEUE_SIZE) {
      return none;
    }

    const value = mailboxQueue.shift() as Value;

    return some(value);
  }

  public receive(process: RuntimeProcess, messageKey: MessageKey<unknown>): void {
    process.receive(messageKey);

    this.#registerReceiver(messageKey, process);
  }

  public spawn<Relic>(ritual: Ritual<Relic>, descriptor: ProcessDescriptor): RuntimeProcess<Relic> {
    const spawnedProcess = new RuntimeProcess<Relic>(this.#ref, ritual, descriptor);

    this.#registerOwnedProcess(spawnedProcess);

    return spawnedProcess;
  }

  public halt(process: RuntimeProcess, failure: Failure): void {
    notImplemented(
      `RuntimeScope.halt (${process.descriptor.completionMode}, ${failure.message()})`,
    );
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
    return this.#status === "completed" || this.#status === "failed";
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

  #registerOwnedProcess(process: RuntimeProcess): void {
    this.#processContainerFor(process).add(process);
    this.#observeOwnedProcess(process);
  }

  #processContainerFor(process: RuntimeProcess): Set<RuntimeProcess> {
    if (process.descriptor.completionMode === "structural") {
      return this.#structuralProcesses;
    }

    return this.#detachedProcesses;
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

  #observeChildScope(childScope: RuntimeScope): void {
    childScope.observe((observedScope) => {
      notImplemented(`RuntimeScope observed child scope lifecycle (${observedScope.status})`);
    });
  }

  #observeOwnedProcess(process: RuntimeProcess): void {
    process.observe((observedProcess) => {
      this.#zone.trackProcess(observedProcess);
      notImplemented(`RuntimeScope observed process lifecycle (${observedProcess.status})`);
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

export type RuntimeScopeStatus = "running" | "completing" | "failing" | "completed" | "failed";

export interface RuntimeZone {
  trackProcess(process: RuntimeProcess): void;
}

export type RuntimeScopeObserver = (scope: RuntimeScope) => void;
