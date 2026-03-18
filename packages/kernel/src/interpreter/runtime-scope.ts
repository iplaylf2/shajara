// oxlint-disable max-lines
// oxlint-disable class-methods-use-this
import type {
  ContextKey,
  FailureShape,
  FutureKey,
  FutureSettleKey,
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
import { notImplemented } from "#src/internal/not-implemented";

export class RuntimeScope {
  public static create(spec: ScopeSpec, entry: Ritual<unknown>): RuntimeScope {
    return new RuntimeScope(spec, RuntimeScope.#sentinel, entry);
  }

  public branch(spec: ScopeSpec, entry: Ritual<unknown>): RuntimeScope {
    const child = new RuntimeScope(spec, this, entry);

    this.#children.add(child);
    return child;
  }

  public lookup<Value>(contextKey: ContextKey<Value>): Option<Value> {
    if (this.#bindings.has(contextKey)) {
      return some(this.#bindings.get(contextKey) as Value);
    }

    if (RuntimeScope.#isSentinel(this.#parent)) {
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
    _scope: ScopeRef<unknown>,
    _messageKey: MessageKey<Value>,
    _value: Value,
  ): void {
    notImplemented("RuntimeScope.send");
  }

  public tryReceive<Value>(_messageKey: MessageKey<Value>): Option<Value> {
    return notImplemented("RuntimeScope.tryReceive");
  }

  public observeRunnable(_listener: RunnableListener): Unsubscribe {
    return notImplemented("RuntimeScope.observeRunnable");
  }

  public spawn<Relic>(
    ritual: Ritual<Relic>,
    participation: RuntimeParticipation,
  ): RuntimeProcess<Relic> {
    const exitFuture = this.#issueProcessExitFuture<Relic>();
    const process = new RuntimeProcess<Relic>(this.ref, exitFuture, {
      participation,
      ritual,
    });

    this.#processes.add(process as RuntimeProcess<unknown>);
    return process;
  }

  #issueProcessExitFuture<Relic>(): RuntimeFuture<Relic> {
    return this.createFuture<Relic>();
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

  public createFuture<Result>(): RuntimeFuture<Result> {
    const future = RuntimeFuture.create<Result>();

    const [key, settleKey] = future.handle;

    this.#futureByKey.set(key, future as RuntimeFuture<unknown>);
    this.#futureBySettle.set(settleKey, future as RuntimeFuture<unknown>);
    return future;
  }

  public readonly ref: ScopeRef<unknown>;

  public get isClosed(): boolean {
    return this.#closed;
  }

  public get processRef(): ProcessRef<unknown> {
    return this.#process.ref;
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

  static #spawnClosingWorker(
    _scope: RuntimeScope,
    _process: ProcessRef<unknown>,
    _failure: FailureShape,
    _createClosingWorker: ClosingWorkerFactory,
  ): void {
    notImplemented("RuntimeScope.spawn closing worker");
  }

  static #isSentinel(scope: RuntimeScope): boolean {
    return scope === RuntimeScope.#sentinel;
  }

  public get exitFuture(): RuntimeFuture<unknown> {
    return this.#exitFuture;
  }

  public get entryProcess(): RuntimeProcess {
    return this.#process;
  }

  private constructor(_spec: ScopeSpec, parent: RuntimeScope, entry: Ritual<unknown>) {
    this.#exitFuture = RuntimeFuture.create<unknown>();
    const entryExitFuture = this.#issueProcessExitFuture<unknown>();
    const [scopeExitFutureKey, scopeExitSettleKey] = this.#exitFuture.handle;

    this.#futureByKey.set(scopeExitFutureKey, this.#exitFuture);
    this.#futureBySettle.set(scopeExitSettleKey, this.#exitFuture);
    this.#parent = parent;
    this.ref = { exitFuture: scopeExitFutureKey } as ScopeRef<unknown>;
    this.#process = this.#branchEntryProcess(
      new RuntimeProcess(this.ref, entryExitFuture, {
        participation: "tracked",
        ritual: entry,
      }),
    );
  }

  #branchEntryProcess(process: RuntimeProcess): RuntimeProcess {
    this.#processes.add(process);
    return process;
  }

  static readonly #sentinel = null as unknown as RuntimeScope;

  readonly #bindings = new Map<ContextKey<unknown>, unknown>();
  readonly #children = new Set<RuntimeScope>();
  #closed = false;
  readonly #futureByKey = new Map<FutureKey<unknown>, RuntimeFuture<unknown>>();
  readonly #futureBySettle = new Map<FutureSettleKey<unknown>, RuntimeFuture<unknown>>();
  readonly #exitFuture: RuntimeFuture<unknown>;
  readonly #parent: RuntimeScope;
  readonly #process: RuntimeProcess;
  readonly #processes = new Set<RuntimeProcess>();
}

export type ClosingWorkerFactory = (
  scope: ScopeRef<unknown>,
  processes: readonly ProcessRef<unknown>[],
  failure: Failure,
) => Ritual<Failure>;

export type RuntimeParticipation = "tracked" | "auxiliary";
export type RunnableListener = (process: ProcessRef<unknown>) => void;
export type Unsubscribe = () => void;
