// oxlint-disable max-lines
import type { BranchHandle, SelfHandle } from "#src/sigils";
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
  Wisp,
} from "#src/contracts";
import { isSome, left, none, right, some } from "#src/utils";
import type { Option } from "#src/utils";

export interface RuntimeFuture {
  readonly key: FutureKey<unknown>;
  readonly listeners: Set<(result: FutureResult<unknown>) => void>;
  result: Option<FutureResult<unknown>>;
  readonly settleKey: FutureSettleKey<unknown>;
  readonly waitingProcesses: Set<RuntimeProcess>;
}

export interface RuntimeScope {
  readonly bindings: Map<ContextKey<unknown>, unknown>;
  readonly children: Set<RuntimeScope>;
  closed: boolean;
  readonly exitFuture: RuntimeFuture;
  readonly futures: Set<RuntimeFuture>;
  readonly mailboxes: Map<MessageKey<unknown>, RuntimeMailbox>;
  readonly parent: RuntimeScope | null;
  readonly processRef: ProcessRef<unknown>;
  readonly processes: Set<RuntimeProcess>;
  readonly ref: ScopeRef<unknown>;
  readonly spec: ScopeSpec;
}

export interface RuntimeMailbox {
  readonly buffer: RuntimeMessage[];
  readonly waitingProcesses: RuntimeProcess[];
}

export interface RuntimeMessage {
  readonly from: ScopeRef<unknown>;
  readonly value: unknown;
}

export interface RuntimeBlocker {
  continuation: ((echo: unknown) => Wisp<unknown>) | null;
  future: RuntimeFuture | null;
  readonly kind: "future" | "receive";
}

export interface RuntimeContinuation {
  readonly echo: unknown;
  readonly kind: "resonate";
  readonly resonate: (echo: unknown) => Wisp<unknown>;
}

export class RuntimeProcess<Relic = unknown> {
  public blocker: RuntimeBlocker | null = null;
  public continuation: RuntimeContinuation | null = null;
  public result: FutureResult<Relic> | null = null;
  public status: "ready" | "blocked" | "exited" = "ready";
  public wisp: Wisp<unknown>;

  public constructor(config: RuntimeProcessConfig<Relic>) {
    this.exitFuture = config.exitFuture;
    this.#onExited = config.onExited;
    this.participation = config.participation;
    this.ref = config.ref;
    this.scopeRef = config.scopeRef;
    this.wisp = config.ritual() as Wisp<unknown>;
  }

  public readonly exitFuture: RuntimeFuture;
  public readonly participation: "tracked" | "auxiliary";
  public readonly ref: ProcessRef<Relic>;
  public readonly scopeRef: ScopeRef<unknown>;
  readonly #onExited: (process: RuntimeProcess) => void;

  public get hasQueuedContinuation(): boolean {
    return this.continuation !== null;
  }

  public setContinuation(resonate: (echo: unknown) => Wisp<unknown>, echo: unknown): void {
    this.continuation = {
      echo,
      kind: "resonate",
      resonate,
    };
  }

  public resonate(): void {
    const continuation = this.continuation!;

    this.continuation = null;
    this.wisp = continuation.resonate(continuation.echo);

    if (this.wisp.bearing === "resting") {
      this.complete(this.wisp.relic);
    }
  }

  public wait(future: RuntimeFuture): void {
    this.blocker = {
      continuation: null,
      future,
      kind: "future",
    };
    this.status = "blocked";
    future.waitingProcesses.add(this);
  }

  public receive(): void {
    this.blocker = {
      continuation: null,
      future: null,
      kind: "receive",
    };
    this.status = "blocked";
  }

  public primeContinuation(continuation: (echo: unknown) => Wisp<unknown>): void {
    this.blocker!.continuation = continuation;
  }

  public unblock(echo: unknown): void {
    if (this.blocker === null || this.blocker.continuation === null) {
      return;
    }

    this.setContinuation(this.blocker.continuation, echo);
    this.blocker.future?.waitingProcesses.delete(this);
    this.blocker = null;
    this.status = "ready";
  }

  public complete(value: unknown): void {
    if (this.status === "exited") {
      return;
    }

    this.blocker = null;
    this.continuation = null;
    this.result = right(value) as FutureResult<Relic>;
    this.status = "exited";
    this.#onExited(this);
  }

  public fail(failure: FailureShape): void {
    if (this.status === "exited") {
      return;
    }

    this.blocker = null;
    this.continuation = null;
    this.result = left(failure) as FutureResult<Relic>;
    this.status = "exited";
    this.#onExited(this);
  }

  public branchHandle(): BranchHandle<Relic> {
    return {
      processRef: this.ref,
      scopeRef: this.scopeRef as ScopeRef<Relic>,
    };
  }

  public selfHandle(): SelfHandle<ScopeRef<unknown>> {
    return {
      processRef: this.ref,
      scopeRef: this.scopeRef,
    };
  }
}

export interface RuntimeFuturePair<Result> {
  readonly future: RuntimeFuture;
  readonly key: FutureKey<Result>;
  readonly settleKey: FutureSettleKey<Result>;
}

export function createFuture<Result>(): RuntimeFuturePair<Result> {
  return createFuturePair(createFutureKey<Result>());
}

export function createProcess<Relic>(
  scopeRef: ScopeRef<unknown>,
  ritual: Ritual<Relic>,
  participation: "tracked" | "auxiliary",
  onExited: (process: RuntimeProcess) => void,
): RuntimeProcess<Relic> {
  const { future: exitFuture, key } = createFuture<Relic>();
  const ref = { exitFuture: key } as ProcessRef<Relic>;

  return new RuntimeProcess({
    exitFuture,
    onExited,
    participation,
    ref,
    ritual,
    scopeRef,
  });
}

export function receiveMessage(mailbox: RuntimeMailbox): Option<unknown> {
  const message = mailbox.buffer.shift();

  if (typeof message === "undefined") {
    return none;
  }

  return some(message.value);
}

export function waitForMessage(mailbox: RuntimeMailbox, process: RuntimeProcess): void {
  process.receive();
  mailbox.waitingProcesses.push(process);
}

export function sendMessage(
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

function createFuturePair<Result>(key: FutureKey<Result>): RuntimeFuturePair<Result> {
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

function createFutureKey<Result>(): FutureKey<Result> {
  return {} as FutureKey<Result>;
}

export function completeProcess(process: RuntimeProcess, value: unknown): FutureResult<unknown> {
  process.complete(value);
  const result = process.result!;
  return result;
}

export function failProcess(process: RuntimeProcess, failure: FailureShape): FutureResult<unknown> {
  process.fail(failure);
  const result = process.result!;
  return result;
}

export function unblockProcess(process: RuntimeProcess, result: FutureResult<unknown>): void {
  process.unblock(result);
}

export function settleFuture(
  future: RuntimeFuture,
  result: FutureResult<unknown>,
): Set<RuntimeProcess> {
  if (isSome(future.result)) {
    throw new Error("Not implemented: duplicate future settlement.");
  }

  future.result = some(result);
  notifyFutureListeners(future, result);
  return releaseWaitingProcesses(future, result);
}

export function closeScopeIfSettled(scope: RuntimeScope): RuntimeScope | null {
  if (scope.closed) {
    return null;
  }

  for (const process of scope.processes) {
    if (process.status !== "exited") {
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

export function mirrorScopeExit(
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
    unblockProcess(waitingProcess, result);
    unblocked.add(waitingProcess);
  }

  future.waitingProcesses.clear();
  return unblocked;
}

interface RuntimeProcessConfig<Relic> {
  readonly exitFuture: RuntimeFuture;
  readonly onExited: (process: RuntimeProcess) => void;
  readonly participation: "tracked" | "auxiliary";
  readonly ref: ProcessRef<Relic>;
  readonly ritual: Ritual<Relic>;
  readonly scopeRef: ScopeRef<unknown>;
}
