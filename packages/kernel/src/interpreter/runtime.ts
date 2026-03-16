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
  readonly parent: RuntimeScope | null;
  readonly processRef: ProcessRef<unknown>;
  readonly processes: Set<RuntimeProcess>;
  readonly ref: ScopeRef<unknown>;
  readonly spec: ScopeSpec;
}

export interface RuntimeBlocker {
  readonly future: RuntimeFuture;
  readonly kind: "future";
  readonly resume: (result: FutureResult<unknown>) => Wisp<unknown>;
}

export interface RuntimeContinuation {
  readonly echo: unknown;
  readonly kind: "resonate";
  readonly resume: (echo: unknown) => Wisp<unknown>;
}

export interface RuntimeProcess<Relic = unknown> {
  blocker: RuntimeBlocker | null;
  readonly exitFuture: RuntimeFuture;
  continuation: RuntimeContinuation | null;
  readonly participation: "tracked" | "auxiliary";
  readonly ref: ProcessRef<Relic>;
  result: FutureResult<Relic> | null;
  readonly scope: RuntimeScope;
  status: "ready" | "blocked" | "exited";
  wisp: Wisp<unknown>;
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
  scope: RuntimeScope,
  ritual: Ritual<Relic>,
  participation: "tracked" | "auxiliary",
  ref: ProcessRef<Relic> = createProcessRef<Relic>(),
): RuntimeProcess<Relic> {
  return {
    blocker: null,
    continuation: null,
    exitFuture: createFuturePair(ref.exitFuture).future,
    participation,
    ref,
    result: null,
    scope,
    status: "ready",
    wisp: ritual() as Wisp<unknown>,
  };
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
  resume: (result: FutureResult<unknown>) => Wisp<unknown>,
): void {
  process.blocker = {
    future,
    kind: "future",
    resume,
  };
  process.status = "blocked";
  future.waitingProcesses.add(process);
}

export function unblockProcess(process: RuntimeProcess, result: FutureResult<unknown>): void {
  if (process.blocker === null) {
    return;
  }

  process.continuation = {
    echo: result,
    kind: "resonate",
    resume: process.blocker.resume as (echo: unknown) => Wisp<unknown>,
  };
  process.blocker.future.waitingProcesses.delete(process);
  process.blocker = null;
  process.status = "ready";
}

export function queueContinuation(
  process: RuntimeProcess,
  resume: (echo: unknown) => Wisp<unknown>,
  echo: unknown,
): void {
  process.continuation = {
    echo,
    kind: "resonate",
    resume,
  };
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
