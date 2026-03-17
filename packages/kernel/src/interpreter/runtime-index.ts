import type { FutureKey, FutureSettleKey, ProcessRef, ScopeRef } from "#src/contracts";
import type { FutureRecord } from "./future-record";
import type { RuntimeProcess } from "./runtime-process";
import type { RuntimeScope } from "./runtime-scope";

export class RuntimeIndex {
  public registerScope(scope: RuntimeScope): void {
    this.#scopeByRef.set(scope.ref as ScopeRef<unknown>, scope);
    this.#registerFuture(scope.requireFuture(scope.ref.exitFuture));
    this.registerProcess(scope.process);
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
    this.#registerFuture(this.resolveScope(process.scopeRef).requireFuture(process.ref.exitFuture));
  }

  public resolveProcess<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic> {
    const runtimeProcess = this.#tryReadProcess(processRef);

    if (typeof runtimeProcess !== "undefined") {
      return runtimeProcess as RuntimeProcess<Relic>;
    }

    throw new Error("Unknown process reference.");
  }

  public registerFuture<Result>(scope: RuntimeScope, future: FutureKey<Result>): void {
    this.#registerFuture(scope.requireFuture(future));
  }

  #tryReadProcess<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic> | undefined {
    return this.#processByRef.get(processRef as ProcessRef<unknown>) as
      | RuntimeProcess<Relic>
      | undefined;
  }

  readonly #futureByKey = new WeakMap<FutureKey<unknown>, FutureRecord>();
  readonly #futureBySettle = new WeakMap<FutureSettleKey<unknown>, FutureRecord>();
  readonly #processByRef = new WeakMap<ProcessRef<unknown>, RuntimeProcess>();
  readonly #scopeByRef = new WeakMap<ScopeRef<unknown>, RuntimeScope>();

  #registerFuture(future: FutureRecord): void {
    this.#futureByKey.set(future.key, future);
    this.#futureBySettle.set(future.settleKey, future);
  }
}
