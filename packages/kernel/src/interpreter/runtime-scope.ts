// oxlint-disable class-methods-use-this
import type {
  ContextKey,
  FailureShape,
  MessageKey,
  ProcessRef,
  Ritual,
  ScopeRef,
  ScopeSpec,
} from "#src/contracts";
import { none, some } from "#src/utils";
import type { Failure } from "#src/failures";
import type { Option } from "#src/utils";
import { RuntimeFuture } from "./runtime-future";
import { RuntimeProcess } from "./runtime-process";
import type { SpawnParticipation } from "#src/sigils";
import { notImplemented } from "#src/internal/not-implemented";

const EMPTY_QUEUE_SIZE = 0;

export class RuntimeScope {
  public static create(entry: Ritual<unknown>, spec: ScopeSpec): RuntimeScope {
    return new RuntimeScope(entry, spec, RuntimeScope.#sentinel);
  }

  public branch(entry: Ritual<unknown>, spec: ScopeSpec): RuntimeScope {
    if (this.#status !== "open") {
      throw new Error("Cannot branch in closing scope.");
    }

    const child = new RuntimeScope(entry, spec, this);

    this.#children.add(child);

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
    if (targetScope.#status === "closed") {
      throw new Error("Cannot send to closed scope.");
    }

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

  public observeRunnable(_listener: RunnableListener): Unsubscribe {
    return notImplemented("RuntimeScope.observeRunnable");
  }

  public spawn<Relic>(
    ritual: Ritual<Relic>,
    participation: SpawnParticipation,
  ): RuntimeProcess<Relic> {
    if (this.#status !== "open") {
      throw new Error("Cannot spawn in closing scope.");
    }

    const process = new RuntimeProcess<Relic>(this.#ref, ritual, participation);

    this.#spawnedProcesses.add(process);

    return process;
  }

  public halt(
    _process: ProcessRef<unknown>,
    _failure: FailureShape,
    _createClosingWorker: HaltHandler,
  ): void {
    if (this.#status === "closed") {
      return;
    }

    this.#status = "closing";

    notImplemented("RuntimeScope.halt closing protocol");
  }

  public createFuture<Result>(): RuntimeFuture<Result> {
    const future = RuntimeFuture.create<Result>();

    this.#derivedFutures.add(future);

    return future;
  }

  public get ref(): ScopeRef<unknown> {
    return this.#ref;
  }

  public get status(): RuntimeScopeStatus {
    return this.#status;
  }

  public get isClosed(): boolean {
    return this.#status === "closed";
  }

  public get exitFuture(): RuntimeFuture<unknown> {
    return this.#exitFuture;
  }

  public get entryProcess(): RuntimeProcess {
    return this.#process;
  }

  private constructor(entry: Ritual<unknown>, _spec: ScopeSpec, parent: RuntimeScope) {
    this.#exitFuture = RuntimeFuture.create<unknown>();
    const [scopeExitFuture] = this.#exitFuture.handle;
    this.#ref = { exitFuture: scopeExitFuture } as ScopeRef<unknown>;

    const entryProcess = new RuntimeProcess(this.#ref, entry, "tracked");
    this.#process = entryProcess;

    this.#parent = parent;
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

  static readonly #sentinel = null as unknown as RuntimeScope;

  readonly #exitFuture: RuntimeFuture<unknown>;
  readonly #ref: ScopeRef<unknown>;
  readonly #process: RuntimeProcess;
  readonly #parent: RuntimeScope;

  #status: RuntimeScopeStatus = "open";
  readonly #children = new Set<RuntimeScope>();

  // MessageKey is a capability token; mailbox indexing should not retain key lifetime.
  // Values are queued and consumed by FIFO semantics (`push` then `shift`).
  readonly #mailboxes = new WeakMap<MessageKey<unknown>, unknown[]>();
  readonly #receiverQueues = new WeakMap<MessageKey<unknown>, RuntimeProcess[]>();

  readonly #derivedFutures = new Set<RuntimeFuture<unknown>>();
  readonly #spawnedProcesses = new Set<RuntimeProcess>();
  readonly #bindings = new Map<ContextKey<unknown>, unknown>();
}

export type RuntimeScopeStatus = "open" | "closing" | "closed";

export type HaltHandler = (
  scope: ScopeRef<unknown>,
  processes: readonly ProcessRef<unknown>[],
  failure: Failure,
) => Ritual<Failure>;

export type RunnableListener = (process: ProcessRef<unknown>) => void;
export type Unsubscribe = () => void;
