// oxlint-disable max-lines
import type {
  ContextKey,
  FailureShape,
  FutureKey,
  FutureResult,
  FutureSettleKey,
  MessageKey,
  ProcessRef,
  Ritual,
  ScopeRef,
  ScopeSpec,
} from "#src/contracts";
import { isSome, none, some } from "#src/utils";
import type { Failure } from "#src/failures";
import type { Option } from "#src/utils";
import { RuntimeProcess } from "./runtime-process";
import { notImplemented } from "#src/internal/not-implemented";

export class RuntimeScope {
  public static create(entry: Ritual<unknown>, spec: ScopeSpec): RuntimeScope {
    return new RuntimeScope(
      entry,
      spec,
      {
        futureByKey: new WeakMap(),
        futureBySettle: new WeakMap(),
        processByRef: new WeakMap(),
        runnableObservers: new Set(),
        scopeByRef: new WeakMap(),
      },
      null,
    );
  }

  public get entryProcess(): RuntimeProcess {
    return this.readProcess(this.processRef);
  }

  public branch(entry: Ritual<unknown>, spec: ScopeSpec): RuntimeScope {
    const child = new RuntimeScope(entry, spec, this.#shared, this);

    this.children.add(child);
    return child;
  }

  public lookup<Value>(contextKey: ContextKey<Value>): Option<Value> {
    if (this.bindings.has(contextKey)) {
      return some(this.bindings.get(contextKey) as Value);
    }

    if (this.parent === null) {
      return none;
    }

    return this.parent.lookup(contextKey);
  }

  public resolve<Relic>(scopeRef: ScopeRef<Relic>): RuntimeScope {
    const resolved = this.#scopeByRef.get(scopeRef);

    if (typeof resolved !== "undefined") {
      return resolved;
    }

    throw new Error("Unknown scope reference.");
  }

  public observeRunnable(listener: (process: ProcessRef<unknown>) => void): () => void {
    this.#runnableObservers.add(listener);
    return () => {
      this.#runnableObservers.delete(listener);
    };
  }

  public readProcess<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic> {
    const runtimeProcess = this.#processByRef.get(processRef);

    if (typeof runtimeProcess !== "undefined") {
      return runtimeProcess as RuntimeProcess<Relic>;
    }

    throw new Error("Unknown process reference.");
  }

  public spawn<Relic>(
    worker: Ritual<Relic>,
    participation: "tracked" | "auxiliary",
  ): RuntimeProcess<Relic> {
    const { future: exitFuture, key } = createFuture<Relic>();
    const ref = { exitFuture: key } as ProcessRef<Relic>;

    return this.#registerProcess(
      new RuntimeProcess({
        exitFuture,
        onExited: (process) => this.#onProcessExited(process),
        participation,
        ref,
        ritual: worker,
        scopeRef: this.ref,
      }),
    );
  }

  public bind<Value>(contextKey: ContextKey<Value>, value: Value): void {
    this.bindings.set(contextKey, value);
  }

  public unbind(contextKey: ContextKey<unknown>): void {
    this.bindings.delete(contextKey);
  }

  public poll<Result>(future: FutureKey<Result>): Option<FutureResult<Result>> {
    return this.#requireFuture(future).result as Option<FutureResult<Result>>;
  }

  public wait<Result>(
    future: FutureKey<Result>,
    onSettled: (result: FutureResult<Result>) => void,
  ): void {
    const runtimeFuture = this.#requireFuture(future);

    if (isSome(runtimeFuture.result)) {
      onSettled(runtimeFuture.result.value as FutureResult<Result>);
      return;
    }

    runtimeFuture.listeners.add(onSettled as (result: FutureResult<unknown>) => void);
  }

  public createFuture<Result>(): readonly [FutureKey<Result>, FutureSettleKey<Result>] {
    const future = createFuture<Result>();

    this.futures.add(future.future);
    this.#registerFuture(future.future);
    return [future.key, future.settleKey];
  }

  public requireFuture<Result>(future: FutureKey<Result>): RuntimeFuture {
    return this.#requireFuture(future);
  }

  public settleFuture<Result>(
    futureSettle: FutureSettleKey<Result>,
    result: FutureResult<Result>,
  ): void {
    const future = this.#requireFutureBySettle(futureSettle);
    const unblocked = settleFuture(future, result as FutureResult<unknown>);

    for (const process of unblocked) {
      this.#notifyRunnable(process.ref);
    }
  }

  public tryReceive<Value>(messageKey: MessageKey<Value>): Option<Value> {
    return receiveMessage(this.#mailbox(messageKey)) as Option<Value>;
  }

  public receive(process: ProcessRef<unknown>, messageKey: MessageKey<unknown>): void {
    waitForMessage(this.#mailbox(messageKey), this.readProcess(process));
  }

  public send<Value>(to: ScopeRef<unknown>, messageKey: MessageKey<Value>, value: Value): void {
    const process = sendMessage(this.resolve(to).#mailbox(messageKey), this.ref, value);

    if (process !== null) {
      this.#notifyRunnable(process.ref);
    }
  }

  public halt(
    process: ProcessRef<unknown>,
    failure: FailureShape,
    createClosingWorker: ClosingWorkerFactory,
  ): void {
    RuntimeScope.#haltProcess(this, process, failure);
    RuntimeScope.#enterClosing(this, failure);
    RuntimeScope.#spawnClosingWorker(this, process, failure, createClosingWorker);
  }

  public readonly exitFuture: RuntimeFuture;
  public readonly parent: RuntimeScope | null;
  public readonly ref: ScopeRef<unknown>;
  public readonly spec: ScopeSpec;
  public readonly bindings = new Map<ContextKey<unknown>, unknown>();
  public readonly children = new Set<RuntimeScope>();
  public readonly futures = new Set<RuntimeFuture>();
  public readonly mailboxes = new Map<MessageKey<unknown>, RuntimeMailbox>();
  public readonly processes = new Set<RuntimeProcess>();
  public closed = false;
  public processRef: ProcessRef<unknown>;

  #registerFuture(future: RuntimeFuture): RuntimeFuture {
    this.#futureByKey.set(future.key, future);
    this.#futureBySettle.set(future.settleKey, future);
    return future;
  }

  #registerProcess<Relic>(process: RuntimeProcess<Relic>): RuntimeProcess<Relic> {
    this.#registerFuture(process.exitFuture);
    this.resolve(process.scopeRef).processes.add(process);
    this.#processByRef.set(process.ref, process);
    this.#notifyRunnable(process.ref);
    return process;
  }

  #requireFuture<Result>(future: FutureKey<Result>): RuntimeFuture {
    const runtimeFuture = this.#futureByKey.get(future);

    if (typeof runtimeFuture !== "undefined") {
      return runtimeFuture;
    }

    throw new Error("Unknown future reference.");
  }

  #requireFutureBySettle<Result>(future: FutureSettleKey<Result>): RuntimeFuture {
    const runtimeFuture = this.#futureBySettle.get(future);

    if (typeof runtimeFuture !== "undefined") {
      return runtimeFuture;
    }

    throw new Error("Unknown future settle reference.");
  }

  static #haltProcess(
    _scope: RuntimeScope,
    _process: ProcessRef<unknown>,
    _failure: FailureShape,
  ): void {
    notImplemented("RuntimeScope.halt process exit");
  }

  static #enterClosing(_scope: RuntimeScope, _failure: FailureShape): void {
    notImplemented("RuntimeScope.enter closing subtree");
  }

  #mailbox(messageKey: MessageKey<unknown>): RuntimeMailbox {
    const existing = this.mailboxes.get(messageKey);

    if (typeof existing !== "undefined") {
      return existing;
    }

    const mailbox: RuntimeMailbox = {
      buffer: [],
      waitingProcesses: [],
    };

    this.mailboxes.set(messageKey, mailbox);
    return mailbox;
  }

  static #spawnClosingWorker(
    _scope: RuntimeScope,
    _process: ProcessRef<unknown>,
    _failure: FailureShape,
    _createClosingWorker: ClosingWorkerFactory,
  ): void {
    notImplemented("RuntimeScope.spawn closing worker");
  }

  #onProcessExited(process: RuntimeProcess): void {
    let scope: RuntimeScope | null = this.resolve(process.scopeRef);
    const result = process.result as FutureResult<unknown>;

    settleFuture(process.exitFuture, result);

    if (scope.processRef === process.ref) {
      const scopeResult = mirrorScopeExit(scope, this.#processByRef);

      if (scopeResult !== null) {
        settleFuture(scope.exitFuture, scopeResult);
      }
    }

    while (scope !== null) {
      scope = closeScopeIfSettled(scope);
    }
  }

  #notifyRunnable(process: ProcessRef<unknown>): void {
    for (const listener of this.#runnableObservers) {
      listener(process);
    }
  }

  get #futureByKey(): WeakMap<FutureKey<unknown>, RuntimeFuture> {
    return this.#shared.futureByKey;
  }
  get #futureBySettle(): WeakMap<FutureSettleKey<unknown>, RuntimeFuture> {
    return this.#shared.futureBySettle;
  }
  get #processByRef(): WeakMap<ProcessRef<unknown>, RuntimeProcess> {
    return this.#shared.processByRef;
  }
  get #runnableObservers(): Set<(process: ProcessRef<unknown>) => void> {
    return this.#shared.runnableObservers;
  }
  get #scopeByRef(): WeakMap<ScopeRef<unknown>, RuntimeScope> {
    return this.#shared.scopeByRef;
  }

  private constructor(
    entry: Ritual<unknown>,
    spec: ScopeSpec,
    shared: RuntimeScopeSharedConfig,
    parent: RuntimeScope | null,
  ) {
    const { future: exitFuture, key } = createFuture<unknown>();

    this.#shared = shared;
    this.exitFuture = exitFuture;
    this.parent = parent;
    this.processRef = null as unknown as ProcessRef<unknown>;
    this.ref = { exitFuture: key } as ScopeRef<unknown>;
    this.spec = spec;

    this.#scopeByRef.set(this.ref, this);
    this.processRef = this.spawn(entry, "tracked").ref;
  }

  readonly #shared: RuntimeScopeSharedConfig;
}

export interface RuntimeFuture {
  readonly key: FutureKey<unknown>;
  readonly listeners: Set<(result: FutureResult<unknown>) => void>;
  result: Option<FutureResult<unknown>>;
  readonly settleKey: FutureSettleKey<unknown>;
  readonly waitingProcesses: Set<RuntimeProcess>;
}

export type ClosingWorkerFactory = (
  scope: ScopeRef<unknown>,
  processes: readonly ProcessRef<unknown>[],
  failure: Failure,
) => Ritual<Failure>;

function createFuture<Result>(): RuntimeFuturePair<Result> {
  const key = {} as FutureKey<Result>;
  const settleKey = {} as FutureSettleKey<Result>;
  const future: RuntimeFuture = {
    key: key as FutureKey<unknown>,
    listeners: new Set(),
    result: none,
    settleKey: settleKey as FutureSettleKey<unknown>,
    waitingProcesses: new Set(),
  };

  return { future, key, settleKey };
}

function receiveMessage(mailbox: RuntimeMailbox): Option<unknown> {
  const message = mailbox.buffer.shift();

  if (typeof message === "undefined") {
    return none;
  }

  return some(message.value);
}

function waitForMessage(mailbox: RuntimeMailbox, process: RuntimeProcess): void {
  process.receive();
  mailbox.waitingProcesses.push(process);
}

function sendMessage(
  mailbox: RuntimeMailbox,
  from: ScopeRef<unknown>,
  value: unknown,
): RuntimeProcess | null {
  const waitingProcess = mailbox.waitingProcesses.shift();

  if (typeof waitingProcess === "undefined") {
    mailbox.buffer.push({ from, value });
    return null;
  }

  waitingProcess.unblock(value);
  return waitingProcess;
}

function settleFuture(future: RuntimeFuture, result: FutureResult<unknown>): Set<RuntimeProcess> {
  if (isSome(future.result)) {
    throw new Error("Not implemented: duplicate future settlement.");
  }

  future.result = some(result);
  notifyFutureListeners(future, result);
  return releaseWaitingProcesses(future, result);
}

function closeScopeIfSettled(scope: RuntimeScope): RuntimeScope | null {
  if (scope.closed) {
    return null;
  }

  for (const process of scope.processes) {
    if (process.status !== "completed") {
      return null;
    }
  }

  for (const child of scope.children) {
    if (!child.closed) {
      return null;
    }
  }

  scope.closed = true;
  return scope.parent;
}

function mirrorScopeExit(
  scope: RuntimeScope,
  processByRef: WeakMap<ProcessRef<unknown>, RuntimeProcess>,
): FutureResult<unknown> | null {
  return processByRef.get(scope.processRef)?.result ?? null;
}

function notifyFutureListeners(future: RuntimeFuture, result: FutureResult<unknown>): void {
  for (const listener of future.listeners) {
    listener(result);
  }
}

function releaseWaitingProcesses(
  future: RuntimeFuture,
  result: FutureResult<unknown>,
): Set<RuntimeProcess> {
  const unblocked = new Set<RuntimeProcess>();

  for (const waitingProcess of future.waitingProcesses) {
    waitingProcess.unblock(result);
    unblocked.add(waitingProcess);
  }

  future.waitingProcesses.clear();
  return unblocked;
}

interface RuntimeFuturePair<Result> {
  readonly future: RuntimeFuture;
  readonly key: FutureKey<Result>;
  readonly settleKey: FutureSettleKey<Result>;
}

interface RuntimeMailbox {
  readonly buffer: RuntimeMessage[];
  readonly waitingProcesses: RuntimeProcess[];
}

interface RuntimeMessage {
  readonly from: ScopeRef<unknown>;
  readonly value: unknown;
}

interface RuntimeScopeSharedConfig {
  readonly futureByKey: WeakMap<FutureKey<unknown>, RuntimeFuture>;
  readonly futureBySettle: WeakMap<FutureSettleKey<unknown>, RuntimeFuture>;
  readonly processByRef: WeakMap<ProcessRef<unknown>, RuntimeProcess>;
  readonly runnableObservers: Set<(process: ProcessRef<unknown>) => void>;
  readonly scopeByRef: WeakMap<ScopeRef<unknown>, RuntimeScope>;
}
