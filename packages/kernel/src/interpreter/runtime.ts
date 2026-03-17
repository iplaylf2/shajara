import type { BranchHandle, SelfHandle } from "#src/sigils";
import type {
  ContextKey,
  FailureShape,
  FutureKey,
  FutureResult,
  FutureSettleKey,
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
  readonly parent: RuntimeScope | null;
  readonly processRef: ProcessRef<unknown>;
  readonly processes: Set<RuntimeProcess>;
  readonly ref: ScopeRef<unknown>;
  readonly spec: ScopeSpec;
}

export interface RuntimeBlocker {
  readonly future: RuntimeFuture;
  readonly kind: "future";
  readonly resonate: (result: FutureResult<unknown>) => Wisp<unknown>;
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
    this.participation = config.participation;
    this.ref = config.ref;
    this.scopeRef = config.scopeRef;
    this.wisp = config.ritual() as Wisp<unknown>;
  }

  public readonly exitFuture: RuntimeFuture;
  public readonly participation: "tracked" | "auxiliary";
  public readonly ref: ProcessRef<Relic>;
  public readonly scopeRef: ScopeRef<unknown>;

  public get hasQueuedContinuation(): boolean {
    return this.continuation !== null;
  }

  public queueContinuation(resonate: (echo: unknown) => Wisp<unknown>, echo: unknown): void {
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
  }

  public blockOnFuture(
    future: RuntimeFuture,
    resonate: (result: FutureResult<unknown>) => Wisp<unknown>,
  ): void {
    this.blocker = {
      future,
      kind: "future",
      resonate,
    };
    this.status = "blocked";
    future.waitingProcesses.add(this);
  }

  public unblock(result: FutureResult<unknown>): void {
    if (this.blocker === null) {
      return;
    }

    this.queueContinuation(this.blocker.resonate as (echo: unknown) => Wisp<unknown>, result);
    this.blocker.future.waitingProcesses.delete(this);
    this.blocker = null;
    this.status = "ready";
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

export function createProcessRef<Relic>(): ProcessRef<Relic> {
  return { exitFuture: createFutureKey<Relic>() } as ProcessRef<Relic>;
}

export function createProcess<Relic>(
  scopeRef: ScopeRef<unknown>,
  ritual: Ritual<Relic>,
  participation: "tracked" | "auxiliary",
  ref: ProcessRef<Relic> = createProcessRef<Relic>(),
): RuntimeProcess<Relic> {
  return new RuntimeProcess({
    exitFuture: createFuturePair(ref.exitFuture).future,
    participation,
    ref,
    ritual,
    scopeRef,
  });
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
  const result = right(value);

  process.blocker = null;
  process.continuation = null;
  process.result = result;
  process.status = "exited";

  return result;
}

export function failProcess(process: RuntimeProcess, failure: FailureShape): FutureResult<unknown> {
  const result = left(failure);

  process.blocker = null;
  process.continuation = null;
  process.result = result;
  process.status = "exited";

  return result;
}

export function blockOnFuture(
  process: RuntimeProcess,
  future: RuntimeFuture,
  resonate: (result: FutureResult<unknown>) => Wisp<unknown>,
): void {
  process.blockOnFuture(future, resonate);
}

export function unblockProcess(process: RuntimeProcess, result: FutureResult<unknown>): void {
  process.unblock(result);
}

export function queueContinuation(
  process: RuntimeProcess,
  resonate: (echo: unknown) => Wisp<unknown>,
  echo: unknown,
): void {
  process.queueContinuation(resonate, echo);
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
  readonly participation: "tracked" | "auxiliary";
  readonly ref: ProcessRef<Relic>;
  readonly ritual: Ritual<Relic>;
  readonly scopeRef: ScopeRef<unknown>;
}
