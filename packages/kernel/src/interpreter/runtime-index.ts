import type { FutureKey, FutureSettleKey, ProcessRef, ScopeRef } from "#src/contracts";
import type { RuntimeFuture } from "./runtime-future";
import type { RuntimeProcess } from "./runtime-process";
import type { RuntimeScope } from "./runtime-scope";

export class RuntimeIndex {
  public registerScope(scope: RuntimeScope): void {
    this.#scopeByRef.set(scope.ref as ScopeRef<unknown>, scope);
  }

  public resolveScope<Relic>(scopeRef: ScopeRef<Relic>): RuntimeScope {
    const runtimeScope = this.#scopeByRef.get(scopeRef as ScopeRef<unknown>);

    if (typeof runtimeScope !== "undefined") {
      return runtimeScope;
    }

    throw new Error("Unknown scope reference.");
  }

  public registerProcess(process: RuntimeProcess): void {
    this.#processByRef.set(process.ref as ProcessRef<unknown>, process);
  }

  public resolveProcess<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic> {
    const runtimeProcess = this.#tryReadProcess(processRef);

    if (typeof runtimeProcess !== "undefined") {
      return runtimeProcess as RuntimeProcess<Relic>;
    }

    throw new Error("Unknown process reference.");
  }

  public registerFuture(future: RuntimeFuture<unknown>): void {
    this.#registerFuture(future);
  }

  public resolveFuture<Result>(future: FutureKey<Result>): RuntimeFuture<Result> {
    const runtimeFuture = this.#futureByKey.get(future as FutureKey<unknown>);

    if (typeof runtimeFuture !== "undefined") {
      return runtimeFuture as RuntimeFuture<Result>;
    }

    throw new Error("Unknown future reference.");
  }

  public resolveFutureBySettle<Result>(future: FutureSettleKey<Result>): RuntimeFuture<Result> {
    const runtimeFuture = this.#futureBySettle.get(future as FutureSettleKey<unknown>);

    if (typeof runtimeFuture !== "undefined") {
      return runtimeFuture as RuntimeFuture<Result>;
    }

    throw new Error("Unknown future settle reference.");
  }

  #tryReadProcess<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic> | undefined {
    return this.#processByRef.get(processRef as ProcessRef<unknown>) as
      | RuntimeProcess<Relic>
      | undefined;
  }

  readonly #futureByKey = new WeakMap<FutureKey<unknown>, RuntimeFuture<unknown>>();
  readonly #futureBySettle = new WeakMap<FutureSettleKey<unknown>, RuntimeFuture<unknown>>();
  readonly #processByRef = new WeakMap<ProcessRef<unknown>, RuntimeProcess>();
  readonly #scopeByRef = new WeakMap<ScopeRef<unknown>, RuntimeScope>();

  #registerFuture(future: RuntimeFuture<unknown>): void {
    const [key, settleKey] = future.handle;

    this.#futureByKey.set(key, future);
    this.#futureBySettle.set(settleKey, future);
  }
}
