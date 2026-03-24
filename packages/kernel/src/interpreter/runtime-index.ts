import type { FutureKey, FutureSettleKey, ProcessRef, ScopeRef } from "#/contracts";
import type { RuntimeFuture } from "./runtime-future";
import type { RuntimeProcess } from "./runtime-process";
import type { RuntimeScope } from "./runtime-scope";

export class RuntimeIndex {
  public registerScope(scope: RuntimeScope): void {
    this.#scopeByRef.set(scope.ref, scope);
    this.registerFuture(scope.exitFuture);
    this.registerProcess(scope.entryProcess);
  }

  public resolveScope(scopeRef: ScopeRef<unknown>): RuntimeScope {
    const runtimeScope = this.#scopeByRef.get(scopeRef);

    if (runtimeScope) {
      return runtimeScope;
    }

    throw new Error("Unknown scope reference.");
  }

  public registerProcess(process: RuntimeProcess): void {
    this.#processByRef.set(process.ref, process);
    this.registerFuture(process.exitFuture);
  }

  public resolveProcess<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic> {
    const runtimeProcess = this.#processByRef.get(processRef);

    if (runtimeProcess) {
      return runtimeProcess as RuntimeProcess<Relic>;
    }

    throw new Error("Unknown process reference.");
  }

  public registerFuture(future: RuntimeFuture<unknown>): void {
    const [key, settleKey] = future.handle;

    this.#futureByKey.set(key, future);
    this.#futureBySettle.set(settleKey, future);
  }

  public resolveFuture<Result>(future: FutureKey<Result>): RuntimeFuture<Result> {
    const runtimeFuture = this.#futureByKey.get(future);

    if (runtimeFuture) {
      return runtimeFuture as RuntimeFuture<Result>;
    }

    throw new Error("Unknown future reference.");
  }

  public resolveFutureBySettle<Result>(future: FutureSettleKey<Result>): RuntimeFuture<Result> {
    const runtimeFuture = this.#futureBySettle.get(future);

    if (runtimeFuture) {
      return runtimeFuture as RuntimeFuture<Result>;
    }

    throw new Error("Unknown future settle reference.");
  }

  readonly #futureByKey = new WeakMap<FutureKey<unknown>, RuntimeFuture<unknown>>();
  readonly #futureBySettle = new WeakMap<FutureSettleKey<unknown>, RuntimeFuture<unknown>>();
  readonly #processByRef = new WeakMap<ProcessRef<unknown>, RuntimeProcess>();
  readonly #scopeByRef = new WeakMap<ScopeRef<unknown>, RuntimeScope>();
}
