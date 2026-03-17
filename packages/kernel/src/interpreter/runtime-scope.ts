// oxlint-disable max-lines
// oxlint-disable class-methods-use-this
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
import { none, some } from "#src/utils";
import type { Failure } from "#src/failures";
import type { FutureRecord } from "./future-record";
import type { Option } from "#src/utils";
import { RuntimeProcess } from "./runtime-process";
import { notImplemented } from "#src/internal/not-implemented";

export class RuntimeScope {
  public static create(spec: ScopeSpec, entry: Ritual<unknown>): RuntimeScope {
    return new RuntimeScope(spec, RuntimeScope.#sentinel, entry);
  }

  public branch(spec: ScopeSpec, entry: Ritual<unknown>): RuntimeScope {
    const child = new RuntimeScope(spec, this, entry);

    this.children.add(child);
    return child;
  }

  public lookup<Value>(contextKey: ContextKey<Value>): Option<Value> {
    if (this.bindings.has(contextKey)) {
      return some(this.bindings.get(contextKey) as Value);
    }

    if (RuntimeScope.isSentinel(this.parent)) {
      return none;
    }

    return this.parent.lookup(contextKey);
  }

  public bind<Value>(contextKey: ContextKey<Value>, value: Value): void {
    this.bindings.set(contextKey, value);
  }

  public unbind(contextKey: ContextKey<unknown>): void {
    this.bindings.delete(contextKey);
  }

  public poll<Result>(_future: FutureKey<Result>): Option<FutureResult<Result>> {
    return notImplemented("RuntimeScope.poll");
  }

  public wait<Result>(
    _future: FutureKey<Result>,
    _onSettled: (result: FutureResult<Result>) => void,
  ): void {
    notImplemented("RuntimeScope.wait");
  }

  public settle<Result>(
    _futureSettle: FutureSettleKey<Result>,
    _result: FutureResult<Result>,
  ): void {
    notImplemented("RuntimeScope.settle");
  }

  public send<Value>(
    _scope: ScopeRef<unknown>,
    _messageKey: MessageKey<Value>,
    _value: Value,
  ): void {
    notImplemented("RuntimeScope.send");
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

    this.processes.add(process as RuntimeProcess<unknown>);
    return process;
  }

  #issueProcessExitFuture<Relic>(): FutureKey<Relic> {
    const [exitFuture] = this.createFuture<Relic>();
    return exitFuture;
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

  public createFuture<Result>(): readonly [FutureKey<Result>, FutureSettleKey<Result>] {
    const { future, key, settleKey } = createFutureRecord<Result>();

    this.#futureByKey.set(future.key, future);
    this.#futureBySettle.set(future.settleKey, future);
    return [key, settleKey];
  }

  public readonly parent: RuntimeScope;
  public readonly ref: ScopeRef<unknown>;
  public readonly spec: ScopeSpec;
  public readonly bindings = new Map<ContextKey<unknown>, unknown>();
  public readonly children = new Set<RuntimeScope>();
  public readonly mailboxes = new Map<MessageKey<unknown>, RuntimeMailbox>();
  public readonly processes = new Set<RuntimeProcess>();
  public closed = false;
  public readonly process: RuntimeProcess;

  public get processRef(): ProcessRef<unknown> {
    return this.process.ref;
  }

  public requireFuture<Result>(future: FutureKey<Result>): FutureRecord {
    const resolved = this.#futureByKey.get(future as FutureKey<unknown>);

    if (typeof resolved !== "undefined") {
      return resolved;
    }

    throw new Error("Unknown scope future.");
  }

  public requireFutureBySettle<Result>(future: FutureSettleKey<Result>): FutureRecord {
    const resolved = this.#futureBySettle.get(future as FutureSettleKey<unknown>);

    if (typeof resolved !== "undefined") {
      return resolved;
    }

    throw new Error("Unknown scope future settle reference.");
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

  static isSentinel(scope: RuntimeScope): boolean {
    return scope === RuntimeScope.#sentinel;
  }

  private constructor(spec: ScopeSpec, parent: RuntimeScope, entry: Ritual<unknown>) {
    const { future: exitFuture, key } = createFutureRecord<unknown>();
    const entryExitFuture = this.#issueProcessExitFuture<unknown>();

    this.#futureByKey.set(exitFuture.key, exitFuture);
    this.#futureBySettle.set(exitFuture.settleKey, exitFuture);
    this.parent = parent;
    this.ref = { exitFuture: key } as ScopeRef<unknown>;
    this.spec = spec;
    this.process = this.#branchEntryProcess(
      new RuntimeProcess(this.ref, entryExitFuture, {
        participation: "tracked",
        ritual: entry,
      }),
    );
  }

  #branchEntryProcess(process: RuntimeProcess): RuntimeProcess {
    this.processes.add(process);
    return process;
  }

  static readonly #sentinel = null as unknown as RuntimeScope;

  readonly #futureByKey = new Map<FutureKey<unknown>, FutureRecord>();
  readonly #futureBySettle = new Map<FutureSettleKey<unknown>, FutureRecord>();
}

export type ClosingWorkerFactory = (
  scope: ScopeRef<unknown>,
  processes: readonly ProcessRef<unknown>[],
  failure: Failure,
) => Ritual<Failure>;

export type RuntimeParticipation = "tracked" | "auxiliary";

interface RuntimeMailbox {
  readonly buffer: RuntimeMessage[];
  readonly waitingProcesses: ProcessRef<unknown>[];
}

interface RuntimeMessage {
  readonly from: ScopeRef<unknown>;
  readonly value: unknown;
}

function createFutureRecord<Result>(): FutureRecordPair<Result> {
  const key = {} as FutureKey<Result>;
  const settleKey = {} as FutureSettleKey<Result>;
  const future: FutureRecord = {
    key: key as FutureKey<unknown>,
    listeners: new Set(),
    result: none as Option<FutureResult<unknown>>,
    settleKey: settleKey as FutureSettleKey<unknown>,
    waitingProcesses: new Set(),
  };

  return { future, key, settleKey };
}

interface FutureRecordPair<Result> {
  readonly future: FutureRecord;
  readonly key: FutureKey<Result>;
  readonly settleKey: FutureSettleKey<Result>;
}
