import type {
  FutureKey,
  FutureResult,
  FutureSettleKey,
  ProcessRef,
  ScopeRef,
} from "#src/contracts";
import { isSome, some } from "#src/utils";
import type { FutureRecord } from "./future-record";
import type { Option } from "#src/utils";
import type { RuntimeProcess } from "./runtime-process";
import type { RuntimeScope } from "./runtime-scope";

export class RuntimeGraph {
  public registerScope(scope: RuntimeScope): void {
    this.#scopeByRef.set(scope.ref as ScopeRef<unknown>, scope);
    this.#registerFuture(scope.requireFuture(scope.ref.exitFuture));
  }

  public resolveScope<Relic>(scopeRef: ScopeRef<Relic>): RuntimeScope {
    const resolved = this.#scopeByRef.get(scopeRef as ScopeRef<unknown>);

    if (typeof resolved !== "undefined") {
      return resolved;
    }

    throw new Error("Unknown scope reference.");
  }

  public registerProcess(process: RuntimeProcess): void {
    this.#processByRef.set(process.ref as ProcessRef<unknown>, process);
    this.#registerFuture(this.resolveScope(process.scopeRef).requireFuture(process.ref.exitFuture));
  }

  public readProcess<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic> {
    const runtimeProcess = this.tryReadProcess(processRef);

    if (typeof runtimeProcess !== "undefined") {
      return runtimeProcess as RuntimeProcess<Relic>;
    }

    throw new Error("Unknown process reference.");
  }

  public tryReadProcess<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic> | undefined {
    return this.#processByRef.get(processRef as ProcessRef<unknown>) as
      | RuntimeProcess<Relic>
      | undefined;
  }

  public registerFuture<Result>(scope: RuntimeScope, future: FutureKey<Result>): void {
    this.#registerFuture(scope.requireFuture(future));
  }

  public poll<Result>(future: FutureKey<Result>): Option<FutureResult<Result>> {
    return this.requireFuture(future).result as Option<FutureResult<Result>>;
  }

  public wait<Result>(
    future: FutureKey<Result>,
    onSettled: (result: FutureResult<Result>) => void,
  ): void {
    const runtimeFuture = this.requireFuture(future);

    if (isSome(runtimeFuture.result)) {
      onSettled(runtimeFuture.result.value as FutureResult<Result>);
      return;
    }

    runtimeFuture.listeners.add(onSettled as (result: FutureResult<unknown>) => void);
  }

  public blockProcessOnFuture<Result>(
    future: FutureKey<Result>,
    process: ProcessRef<unknown>,
  ): void {
    this.requireFuture(future).waitingProcesses.add(process);
  }

  public requireFuture<Result>(future: FutureKey<Result>): FutureRecord {
    const runtimeFuture = this.#futureByKey.get(future as FutureKey<unknown>);

    if (typeof runtimeFuture !== "undefined") {
      return runtimeFuture;
    }

    throw new Error("Unknown future reference.");
  }

  public requireFutureBySettle<Result>(future: FutureSettleKey<Result>): FutureRecord {
    const runtimeFuture = this.#futureBySettle.get(future as FutureSettleKey<unknown>);

    if (typeof runtimeFuture !== "undefined") {
      return runtimeFuture;
    }

    throw new Error("Unknown future settle reference.");
  }

  public settleFuture<Result>(
    futureSettle: FutureSettleKey<Result>,
    result: FutureResult<Result>,
  ): Set<ProcessRef<unknown>> {
    return settleRuntimeFuture(
      this.requireFutureBySettle(futureSettle),
      result as FutureResult<unknown>,
    );
  }

  readonly #futureByKey = new Map<FutureKey<unknown>, FutureRecord>();
  readonly #futureBySettle = new Map<FutureSettleKey<unknown>, FutureRecord>();
  readonly #processByRef = new Map<ProcessRef<unknown>, RuntimeProcess>();
  readonly #scopeByRef = new Map<ScopeRef<unknown>, RuntimeScope>();

  #registerFuture(future: FutureRecord): void {
    this.#futureByKey.set(future.key, future);
    this.#futureBySettle.set(future.settleKey, future);
  }
}

function settleRuntimeFuture(
  future: FutureRecord,
  result: FutureResult<unknown>,
): Set<ProcessRef<unknown>> {
  if (isSome(future.result)) {
    throw new Error("Not implemented: duplicate future settlement.");
  }

  future.result = some(result);
  notifyFutureListeners(future, result);
  return releaseWaitingProcesses(future);
}

function notifyFutureListeners(future: FutureRecord, result: FutureResult<unknown>): void {
  for (const listener of future.listeners) {
    listener(result);
  }
}

function releaseWaitingProcesses(future: FutureRecord): Set<ProcessRef<unknown>> {
  const unblocked = new Set<ProcessRef<unknown>>();

  for (const waitingProcess of future.waitingProcesses) {
    unblocked.add(waitingProcess);
  }

  future.waitingProcesses.clear();
  return unblocked;
}
