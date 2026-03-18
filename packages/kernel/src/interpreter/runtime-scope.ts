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

const EMPTY_MESSAGE_BUFFER_SIZE = 0;

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

  public send<Value>(
    targetScope: RuntimeScope,
    messageKey: MessageKey<Value>,
    message: Value,
  ): void {
    if (targetScope.#status === "closed") {
      throw new Error("Cannot send to closed scope.");
    }

    targetScope.#enqueueMessage(messageKey, message);
    notImplemented("RuntimeScope.send wakeup protocol");
  }

  public tryReceive<Value>(messageKey: MessageKey<Value>): Option<Value> {
    const messageBuffer = this.#mailboxes.get(messageKey);

    if (!messageBuffer || messageBuffer.length === EMPTY_MESSAGE_BUFFER_SIZE) {
      return none;
    }

    const message = messageBuffer.shift() as Value;

    return some(message);
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

  #enqueueMessage<Value>(messageKey: MessageKey<Value>, message: Value): void {
    const messageBuffer = this.#mailboxes.get(messageKey) ?? [];

    messageBuffer.push(message);
    this.#mailboxes.set(messageKey, messageBuffer);
  }

  static readonly #sentinel = null as unknown as RuntimeScope;

  readonly #exitFuture: RuntimeFuture<unknown>;
  readonly #ref: ScopeRef<unknown>;
  readonly #process: RuntimeProcess;
  readonly #parent: RuntimeScope;

  #status: RuntimeScopeStatus = "open";
  readonly #children = new Set<RuntimeScope>();

  // MessageKey is a capability token; mailbox indexing should not retain key lifetime.
  readonly #mailboxes = new WeakMap<MessageKey<unknown>, unknown[]>();
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
