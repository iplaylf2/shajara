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
import { none, some } from "#src/utils";
import type { Failure } from "#src/failures";
import type { FutureRecord } from "./future-record";
import type { Option } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";

export class RuntimeScope {
  public static create(
    spec: ScopeSpec,
    admitEntryProcessRef: EntryProcessRefFactory,
  ): RuntimeScope {
    return new RuntimeScope(spec, RuntimeScope.#sentinel, admitEntryProcessRef);
  }

  public branch(spec: ScopeSpec, admitEntryProcessRef: EntryProcessRefFactory): RuntimeScope {
    const child = new RuntimeScope(spec, this, admitEntryProcessRef);

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

  public tryReceive<Value>(messageKey: MessageKey<Value>): Option<Value> {
    return receiveMessage(this.#mailbox(messageKey)) as Option<Value>;
  }

  public receive(process: ProcessRef<unknown>, messageKey: MessageKey<unknown>): void {
    waitForMessage(this.#mailbox(messageKey), process);
  }

  public send<Value>(
    messageKey: MessageKey<Value>,
    from: ScopeRef<unknown>,
    value: Value,
  ): ProcessRef<unknown> | null {
    return sendMessage(this.#mailbox(messageKey), from, value);
  }

  public spawn<Relic>(spawnProcessRef: SpawnProcessRefFactory<Relic>): ProcessRef<Relic> {
    const exitFuture = this.issueProcessExitFuture<Relic>();
    const processRef = spawnProcessRef(exitFuture);

    this.processes.add(processRef);
    return processRef;
  }

  public issueProcessExitFuture<Relic>(): FutureKey<Relic> {
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
  public readonly processes = new Set<ProcessRef<unknown>>();
  public closed = false;
  public processRef: ProcessRef<unknown>;

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

  static isSentinel(scope: RuntimeScope): boolean {
    return scope === RuntimeScope.#sentinel;
  }

  private constructor(
    spec: ScopeSpec,
    parent: RuntimeScope,
    admitEntryProcessRef: EntryProcessRefFactory,
  ) {
    const { future: exitFuture, key } = createFutureRecord<unknown>();
    const entryExitFuture = this.issueProcessExitFuture<unknown>();

    this.#futureByKey.set(exitFuture.key, exitFuture);
    this.#futureBySettle.set(exitFuture.settleKey, exitFuture);
    this.parent = parent;
    this.ref = { exitFuture: key } as ScopeRef<unknown>;
    this.processRef = this.#branchEntryProcess(admitEntryProcessRef(this, entryExitFuture));
    this.spec = spec;
  }

  #branchEntryProcess(processRef: ProcessRef<unknown>): ProcessRef<unknown> {
    this.processes.add(processRef);
    return processRef;
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

export type EntryProcessRefFactory = (
  scope: RuntimeScope,
  exitFuture: FutureKey<unknown>,
) => ProcessRef<unknown>;

export type SpawnProcessRefFactory<Relic> = (exitFuture: FutureKey<Relic>) => ProcessRef<Relic>;

function receiveMessage(mailbox: RuntimeMailbox): Option<unknown> {
  const message = mailbox.buffer.shift();

  if (typeof message === "undefined") {
    return none;
  }

  return some(message.value);
}

function waitForMessage(mailbox: RuntimeMailbox, process: ProcessRef<unknown>): void {
  mailbox.waitingProcesses.push(process);
}

function sendMessage(
  mailbox: RuntimeMailbox,
  from: ScopeRef<unknown>,
  value: unknown,
): ProcessRef<unknown> | null {
  const waitingProcess = mailbox.waitingProcesses.shift();

  if (typeof waitingProcess === "undefined") {
    mailbox.buffer.push({ from, value });
    return null;
  }

  return waitingProcess;
}

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
