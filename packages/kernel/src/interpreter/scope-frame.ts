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
import type { RuntimeFuture, RuntimeFuturePair, RuntimeProcess, RuntimeScope } from "./runtime";
import {
  closeScopeIfSettled,
  createFuture,
  createProcess,
  mirrorScopeExit,
  receiveMessage,
  sendMessage,
  settleFuture,
  waitForMessage,
} from "./runtime";
import { isSome, none, some } from "#src/utils";
import type { Failure } from "#src/failures";
import type { Option } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";

export class ScopeFrame {
  public static create(entry: Ritual<unknown>, spec: ScopeSpec): ScopeFrame {
    return new ScopeFrame(
      entry,
      spec,
      {
        framesByRef: new WeakMap(),
        futureByKey: new WeakMap(),
        futureBySettle: new WeakMap(),
        processByRef: new WeakMap(),
        processReadyListeners: new Set(),
      },
      ScopeFrame.#origin,
    );
  }

  public branch(entry: Ritual<unknown>, spec: ScopeSpec): ScopeFrame {
    const child = new ScopeFrame(entry, spec, this.#shared, this);

    this.#children.add(child);
    this.runtime.children.add(child.runtime);

    return child;
  }

  public lookup<Value>(contextKey: ContextKey<Value>): Option<Value> {
    if (this.#scope.bindings.has(contextKey)) {
      return some(this.#scope.bindings.get(contextKey) as Value);
    }

    if (this.#parent === ScopeFrame.#origin) {
      return none;
    }

    return this.#parent.lookup(contextKey);
  }

  public resolve<Relic>(scopeRef: ScopeRef<Relic>): ScopeFrame {
    const resolved = this.#framesByRef.get(scopeRef);

    if (typeof resolved !== "undefined") {
      return resolved;
    }

    throw new Error("Unknown scope reference.");
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

  public registerFuture(future: RuntimeFuture): RuntimeFuture {
    this.#futureByKey.set(future.key, future);
    this.#futureBySettle.set(future.settleKey, future);
    return future;
  }

  public createFuture<Result>(): RuntimeFuturePair<Result> {
    const future = createFuture<Result>();

    this.#scope.futures.add(future.future);
    this.registerFuture(future.future);
    return future;
  }

  public requireFuture<Result>(future: FutureKey<Result>): RuntimeFuture {
    return this.#requireFuture(future);
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
      this.#notifyProcessReady(process.ref);
    }
  }

  public halt(
    process: ProcessRef<unknown>,
    failure: FailureShape,
    createClosingWorker: ClosingWorkerFactory,
  ): void {
    ScopeFrame.#haltProcess(this, process, failure);
    ScopeFrame.#enterClosing(this, failure);
    ScopeFrame.#spawnClosingWorker(this, process, failure, createClosingWorker);
  }

  public requireFutureBySettle<Result>(future: FutureSettleKey<Result>): RuntimeFuture {
    const runtimeFuture = this.#futureBySettle.get(future);

    if (typeof runtimeFuture !== "undefined") {
      return runtimeFuture;
    }

    throw new Error("Unknown future settle reference.");
  }

  public settleFuture<Result>(
    futureSettle: FutureSettleKey<Result>,
    result: FutureResult<Result>,
  ): void {
    const future = this.requireFutureBySettle(futureSettle);
    const unblocked = settleFuture(future, result as FutureResult<unknown>);

    for (const process of unblocked) {
      this.#notifyProcessReady(process.ref);
    }
  }

  public onProcessReady(listener: (process: ProcessRef<unknown>) => void): () => void {
    this.#processReadyListeners.add(listener);
    return () => {
      this.#processReadyListeners.delete(listener);
    };
  }

  public bind<Value>(contextKey: ContextKey<Value>, value: Value): void {
    this.#scope.bindings.set(contextKey, value);
  }
  public unbind(contextKey: ContextKey<unknown>): void {
    this.#scope.bindings.delete(contextKey);
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
    return this.#registerProcess(
      createProcess(this.ref, worker, participation, (process) => this.#onProcessExited(process)),
    );
  }

  #registerProcess<Relic>(process: RuntimeProcess<Relic>): RuntimeProcess<Relic> {
    this.registerFuture(process.exitFuture);
    this.resolve(process.scopeRef).runtime.processes.add(process);
    this.#processByRef.set(process.ref, process);
    this.#notifyProcessReady(process.ref);
    return process;
  }

  public get ref(): ScopeRef<unknown> {
    return this.#scope.ref;
  }
  public get processRef(): ProcessRef<unknown> {
    return this.#scope.processRef;
  }
  public get entryProcess(): RuntimeProcess {
    return this.readProcess(this.processRef);
  }
  public get isClosed(): boolean {
    return this.#scope.closed;
  }
  public get runtime(): RuntimeScope {
    return this.#scope;
  }

  private constructor(
    entry: Ritual<unknown>,
    spec: ScopeSpec,
    shared: ScopeFrameSharedConfig,
    parent: ScopeFrame,
  ) {
    this.#shared = shared;
    this.#parent = parent;
    const scope = this.#createScope(spec) as RuntimeScope & { processRef: ProcessRef<unknown> };

    this.#scope = scope;
    this.#framesByRef.set(this.#scope.ref, this);
    scope.processRef = this.spawn(entry, "tracked").ref;
  }

  #createScope(spec: ScopeSpec): RuntimeScope {
    const { future: exitFuture, key } = createFuture<unknown>();
    const scope = {
      bindings: new Map(),
      children: new Set(),
      closed: false,
      exitFuture,
      futures: new Set(),
      mailboxes: new Map(),
      parent: this.#parent === ScopeFrame.#origin ? null : this.#parent.runtime,
      processRef: null as unknown as ProcessRef<unknown>,
      processes: new Set(),
      ref: { exitFuture: key } as ScopeRef<unknown>,
      spec,
    };

    return scope as RuntimeScope;
  }

  #requireFuture<Result>(future: FutureKey<Result>): RuntimeFuture {
    const runtimeFuture = this.#futureByKey.get(future);

    if (typeof runtimeFuture !== "undefined") {
      return runtimeFuture;
    }

    throw new Error("Unknown future reference.");
  }

  static #haltProcess(
    _frame: ScopeFrame,
    _process: ProcessRef<unknown>,
    _failure: FailureShape,
  ): void {
    notImplemented("ScopeFrame.halt process exit");
  }

  static #enterClosing(_frame: ScopeFrame, _failure: FailureShape): void {
    notImplemented("ScopeFrame.enter closing subtree");
  }

  #mailbox(messageKey: MessageKey<unknown>) {
    const existing = this.#scope.mailboxes.get(messageKey);

    if (typeof existing !== "undefined") {
      return existing;
    }

    const mailbox = {
      buffer: [],
      waitingProcesses: [],
    };

    this.#scope.mailboxes.set(messageKey, mailbox);
    return mailbox;
  }

  static #spawnClosingWorker(
    _frame: ScopeFrame,
    _process: ProcessRef<unknown>,
    _failure: FailureShape,
    _createClosingWorker: ClosingWorkerFactory,
  ): void {
    notImplemented("ScopeFrame.spawn closing worker");
  }

  #onProcessExited(process: RuntimeProcess): void {
    let scope: RuntimeScope | null = this.resolve(process.scopeRef).runtime;
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

  #notifyProcessReady(process: ProcessRef<unknown>): void {
    for (const listener of this.#processReadyListeners) {
      listener(process);
    }
  }

  static readonly #origin = null as unknown as ScopeFrame;
  readonly #children = new Set<ScopeFrame>();
  readonly #parent: ScopeFrame;
  readonly #shared: ScopeFrameSharedConfig;
  readonly #scope: RuntimeScope;

  get #framesByRef(): WeakMap<ScopeRef<unknown>, ScopeFrame> {
    return this.#shared.framesByRef;
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
  get #processReadyListeners(): Set<(process: ProcessRef<unknown>) => void> {
    return this.#shared.processReadyListeners;
  }
}

interface ScopeFrameSharedConfig {
  readonly framesByRef: WeakMap<ScopeRef<unknown>, ScopeFrame>;
  readonly futureByKey: WeakMap<FutureKey<unknown>, RuntimeFuture>;
  readonly futureBySettle: WeakMap<FutureSettleKey<unknown>, RuntimeFuture>;
  readonly processReadyListeners: Set<(process: ProcessRef<unknown>) => void>;
  readonly processByRef: WeakMap<ProcessRef<unknown>, RuntimeProcess>;
}

export type ClosingWorkerFactory = (
  scope: ScopeRef<unknown>,
  processes: readonly ProcessRef<unknown>[],
  failure: Failure,
) => Ritual<Failure>;
