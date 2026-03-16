import type {
  ContextKey,
  FailureShape,
  FutureKey,
  FutureResult,
  FutureSettleKey,
  ProcessRef,
  ScopeRef,
  ScopeSpec,
} from "#src/contracts";
import type { RuntimeFuture, RuntimeProcess, RuntimeScope } from "./runtime";
import {
  closeScopeIfSettled,
  completeProcess,
  createFuture,
  failProcess,
  mirrorScopeExit,
  settleFuture,
} from "./runtime";
import { isSome, none, some } from "#src/utils";
import type { Option } from "#src/utils";
import type { ProcessStep } from "./process-step";

export class ScopeFrame {
  public static create(
    spec: ScopeSpec,
    createEntryProcess: (frame: ScopeFrame) => RuntimeProcess,
  ): ScopeFrame {
    return new ScopeFrame(
      spec,
      createEntryProcess,
      {
        framesByRef: new WeakMap(),
        futureByKey: new WeakMap(),
        futureBySettle: new WeakMap(),
        processByRef: new WeakMap(),
      },
      ScopeFrame.#origin,
    );
  }

  public branch(
    spec: ScopeSpec,
    createEntryProcess: (frame: ScopeFrame) => RuntimeProcess,
  ): ScopeFrame {
    const child = new ScopeFrame(spec, createEntryProcess, this.#shared, this);

    this.#children.add(child);
    this.runtime.children.add(child.runtime);

    return child;
  }

  public lookup<Value>(contextKey: ContextKey<Value>): Option<Value> {
    if (this.#scope.bindings.has(contextKey)) {
      return some(this.#scope.bindings.get(contextKey) as Value);
    }

    if (this.#parent === ScopeFrame.#origin) {
      return none;
    }

    return this.#parent.lookup(contextKey);
  }

  public resolve<Relic>(scopeRef: ScopeRef<Relic>): ScopeFrame {
    const resolved = this.#framesByRef.get(scopeRef);

    if (typeof resolved !== "undefined") {
      return resolved;
    }

    throw new Error("Unknown scope reference.");
  }

  public poll<Result>(future: FutureKey<Result>): Option<FutureResult<Result>> {
    return this.#requireFuture(future).result as Option<FutureResult<Result>>;
  }

  public wait<Result>(
    future: FutureKey<Result>,
    onSettled: (result: FutureResult<Result>) => void,
  ): void {
    const runtimeFuture = this.#requireFuture(future);

    if (isSome(runtimeFuture.result)) {
      onSettled(runtimeFuture.result.value as FutureResult<Result>);
      return;
    }

    runtimeFuture.listeners.add(onSettled as (result: FutureResult<unknown>) => void);
  }

  public registerFuture(future: RuntimeFuture): RuntimeFuture {
    this.#futureByKey.set(future.key, future);
    this.#futureBySettle.set(future.settleKey, future);
    return future;
  }

  public requireFuture<Result>(future: FutureKey<Result>): RuntimeFuture {
    return this.#requireFuture(future);
  }

  public requireFutureBySettle<Result>(future: FutureSettleKey<Result>): RuntimeFuture {
    const runtimeFuture = this.#futureBySettle.get(future);

    if (typeof runtimeFuture !== "undefined") {
      return runtimeFuture;
    }

    throw new Error("Unknown future settle reference.");
  }

  public bind<Value>(contextKey: ContextKey<Value>, value: Value): void {
    this.#scope.bindings.set(contextKey, value);
  }

  public unbind(contextKey: ContextKey<unknown>): void {
    this.#scope.bindings.delete(contextKey);
  }

  public readProcess<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic> {
    const runtimeProcess = this.#processByRef.get(processRef);

    if (typeof runtimeProcess !== "undefined") {
      return runtimeProcess as RuntimeProcess<Relic>;
    }

    throw new Error("Unknown process reference.");
  }

  public registerProcess<Relic>(process: RuntimeProcess<Relic>): RuntimeProcess<Relic> {
    this.registerFuture(process.exitFuture);
    process.scope.processes.add(process);
    this.#processByRef.set(process.ref, process);
    return process;
  }

  public completeProcess<Relic>(
    process: RuntimeProcess<Relic>,
    value: unknown,
  ): ProcessStep<Relic> {
    const result = completeProcess(process, value);

    this.#onProcessExited(process, result);

    return { kind: "completed", process: process.ref, value: value as Relic };
  }

  public failProcess<Relic>(
    process: RuntimeProcess<Relic>,
    failure: FailureShape,
  ): ProcessStep<Relic> {
    const result = failProcess(process, failure);

    this.#onProcessExited(process, result);

    return { failure, kind: "failed", process: process.ref };
  }

  public get ref(): ScopeRef<unknown> {
    return this.#scope.ref;
  }

  public get processRef(): ProcessRef<unknown> {
    return this.#scope.processRef;
  }

  public get isClosed(): boolean {
    return this.#scope.closed;
  }

  public get runtime(): RuntimeScope {
    return this.#scope;
  }

  private constructor(
    spec: ScopeSpec,
    createEntryProcess: (frame: ScopeFrame) => RuntimeProcess,
    shared: ScopeFrameSharedConfig,
    parent: ScopeFrame,
  ) {
    this.#shared = shared;
    this.#parent = parent;
    const scope = this.#createScope(spec) as RuntimeScope & { processRef: ProcessRef<unknown> };

    this.#scope = scope;
    this.#framesByRef.set(this.#scope.ref, this);
    scope.processRef = createEntryProcess(this).ref;
  }

  #createScope(spec: ScopeSpec): RuntimeScope {
    const { future: exitFuture, key } = createFuture<unknown>();
    const scope = {
      bindings: new Map(),
      children: new Set(),
      closed: false,
      exitFuture,
      parent: this.#parent === ScopeFrame.#origin ? null : this.#parent.runtime,
      processRef: null as unknown as ProcessRef<unknown>,
      processes: new Set(),
      ref: { exitFuture: key } as ScopeRef<unknown>,
      spec,
    };

    return scope as RuntimeScope;
  }

  #requireFuture<Result>(future: FutureKey<Result>): RuntimeFuture {
    const runtimeFuture = this.#futureByKey.get(future);

    if (typeof runtimeFuture !== "undefined") {
      return runtimeFuture;
    }

    throw new Error("Unknown future reference.");
  }

  #onProcessExited(process: RuntimeProcess, result: FutureResult<unknown>): void {
    const { scope: processScope } = process;
    let scope: RuntimeScope | null = processScope;

    settleFuture(process.exitFuture, result);

    if (scope.processRef === process.ref) {
      const scopeResult = mirrorScopeExit(scope, this.#processByRef);

      if (scopeResult !== null) {
        settleFuture(scope.exitFuture, scopeResult);
      }
    }

    while (scope !== null) {
      scope = closeScopeIfSettled(scope);
    }
  }

  static readonly #origin = null as unknown as ScopeFrame;
  readonly #children = new Set<ScopeFrame>();
  readonly #parent: ScopeFrame;
  readonly #shared: ScopeFrameSharedConfig;
  readonly #scope: RuntimeScope;

  get #framesByRef(): WeakMap<ScopeRef<unknown>, ScopeFrame> {
    return this.#shared.framesByRef;
  }

  get #futureByKey(): WeakMap<FutureKey<unknown>, RuntimeFuture> {
    return this.#shared.futureByKey;
  }

  get #futureBySettle(): WeakMap<FutureSettleKey<unknown>, RuntimeFuture> {
    return this.#shared.futureBySettle;
  }

  get #processByRef(): WeakMap<ProcessRef<unknown>, RuntimeProcess> {
    return this.#shared.processByRef;
  }
}

interface ScopeFrameSharedConfig {
  readonly framesByRef: WeakMap<ScopeRef<unknown>, ScopeFrame>;
  readonly futureByKey: WeakMap<FutureKey<unknown>, RuntimeFuture>;
  readonly futureBySettle: WeakMap<FutureSettleKey<unknown>, RuntimeFuture>;
  readonly processByRef: WeakMap<ProcessRef<unknown>, RuntimeProcess>;
}
