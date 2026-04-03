// oxlint-disable max-lines
import type {
  CleanupTask,
  ProvideRuntimeProcess,
  RuntimeProcessHandle,
  RuntimeProcessKeeper,
  RuntimeProcessNextEcho,
  RuntimeProcessRunner,
} from "./runtime-process";
import type {
  ContextKey,
  Echo,
  FutureKey,
  FutureResult,
  FutureSettleKey,
  MessageKey,
  ProcessRef,
  Ritual,
  ScopeRef,
} from "#/contracts";
import type { FutureSettler, RuntimeFuture } from "./runtime-future";
import type { ProcessDescriptor, ScopeDescriptor, SelfHandle, Sigil } from "#/sigils";
import { either, option } from "fp-ts";
import {
  processCededStep,
  processExitedStep,
  processInterpretedStep,
  processResonatedStep,
  processWaitingStep,
} from "./process-step";
import type { Disposer } from "#/utils";
import type { Failure } from "#/failures";
import type { ProcessStep } from "./process-step";
import { RuntimeProcess } from "./runtime-process";
import { RuntimeScope } from "./runtime-scope";
import type { ScopeZone } from "./scope-zone";
import type { TaggedUnion } from "type-fest";
import { canceledFailure } from "#/failures";

export class Interpreter {
  public step<Relic>(process: ProcessRef<Relic>): ProcessStep<Relic> {
    const processHandle = this.#resolve(process);
    const runner = processHandle.runner();

    switch (runner.status) {
      case "waiting":
        return processWaitingStep();
      case "completed":
        return processExitedStep(either.right(runner.stateAs(runner.status).result));
      case "canceled":
        return processExitedStep(either.left(canceledFailure));
      case "failed":
        return processExitedStep(either.left(runner.stateAs(runner.status).failure));
      case "running": {
        const next = runner.stateAs(runner.status).next();

        switch (next.kind) {
          case "echo":
            return this.#interpret(processHandle, next);
          case "resonate":
            return processResonatedStep();
          case "relic": {
            const scope = this.#resolve(processHandle.scopeRef);
            scope.complete(processHandle.keeper(), next.relic);
            return processExitedStep(either.right(next.relic));
          }
        }
      }
    }
  }

  public observeRootZone(observer: ScopeZone): Disposer {
    this.#rootZoneObservers.add(observer);

    return () => {
      this.#rootZoneObservers.delete(observer);
    };
  }

  public spawn<Relic>(scope: ScopeRef<unknown>, worker: Ritual<Relic>): ProcessRef<Relic> {
    return this.#resolve(scope).spawn(this.#provideProcess(worker), {
      completionMode: "structural",
    });
  }

  public lookup<Value>(
    scope: ScopeRef<unknown>,
    contextKey: ContextKey<Value>,
  ): option.Option<Value> {
    return this.#resolve(scope).lookup(contextKey);
  }

  public poll<Result>(future: FutureKey<Result>): option.Option<FutureResult<Result>> {
    return this.#resolve(future).poll();
  }

  public wait<Result>(future: FutureKey<Result>, onSettled: FutureSettler<Result>): Disposer {
    return this.#resolve(future).wait(onSettled);
  }

  public forceFailed(scope: ScopeRef<unknown>, failure: Failure): void {
    this.#resolve(scope).forceFailed(failure);
  }

  public scopeState(scope: ScopeRef<unknown>): ScopeState {
    const runtimeScope = this.#resolve(scope);
    switch (runtimeScope.status) {
      case "running":
        return { ...scopeInfo(runtimeScope), status: "open" };
      case "closing":
        return { ...scopeInfo(runtimeScope), status: "closing" };
      case "canceling":
        return { ...scopeInfo(runtimeScope), status: "closing" };
      case "failing":
        return { ...scopeInfo(runtimeScope), status: "closing" };
      case "canceled":
      case "completed":
      case "failed":
        return { ...scopeInfo(runtimeScope), status: "closed" };
    }
  }

  public processState(process: ProcessRef<unknown>): ProcessState {
    const runner = this.#resolve(process).runner();

    switch (runner.status) {
      case "running":
        return { activity: "running", status: "open" };
      case "waiting":
        return { activity: "waiting", status: "open" };
      case "completed":
      case "canceled":
      case "failed":
        return { status: "closed" };
    }
  }

  public constructor(entry: Ritual<void>) {
    this.#rootScope = RuntimeScope.create(
      this.#provideProcess(entry),
      { failureMode: "contain" },
      {
        trackProcess: (process) => {
          for (const observer of this.#rootZoneObservers) {
            observer.trackProcess(process);
          }
        },
        trackScope: (scope) => {
          for (const observer of this.#rootZoneObservers) {
            observer.trackScope(scope);
          }
        },
      },
    );

    this.#touch(this.#rootScope);
  }

  public get scopeRoot(): ScopeRef<void> {
    return this.#rootScope as ScopeRef<void>;
  }

  public get processRoot(): ProcessRef<void> {
    return this.#rootScope.entryProcess as ProcessRef<void>;
  }

  public get isClosed(): boolean {
    return this.#rootScope.isClosed;
  }

  protected scopeBranch(
    scope: ScopeRef<unknown>,
    entry: Ritual<unknown>,
    descriptor: ScopeDescriptor,
    zone: ScopeZone,
  ): ScopeRef<unknown> {
    const childScope = branch(this.#resolve(scope), this.#provideProcess(entry), descriptor, zone);
    this.#touch(childScope);
    return childScope;
  }

  // oxlint-disable-next-line max-lines-per-function, max-statements
  #interpret<Relic>(
    process: RuntimeProcessHandle<Relic>,
    next: RuntimeProcessNextEcho<Sigil>,
  ): ProcessStep<Relic> {
    const scope = this.#resolve(process.scopeRef);
    const runner = process.runner();

    const [kind, sigil, accept] = fixRunningNext(next);
    switch (kind) {
      case "bind":
        bind(scope, sigil.key, sigil.value);
        accept(VOID);
        return processInterpretedStep();
      case "branch": {
        const child = this.scopeBranch(scope, sigil.entry, sigil.descriptor, scope.zone);
        const childScope = this.#resolve(child);
        accept({
          process: childScope.entryProcess,
          scope: childScope,
        });
        return processInterpretedStep();
      }
      case "cede":
        accept(VOID);
        return processCededStep();
      case "cancel":
        cancel(scope);
        return processExitedStep(either.left(canceledFailure));
      case "defer":
        defer(runner, (spawnCleanup) => {
          spawnCleanup(this.#provideProcess(sigil.cleanup));
        });

        accept(VOID);
        return processInterpretedStep();
      case "future": {
        const future = createFuture(scope);
        this.#touch(future);

        accept(future.handle());
        return processInterpretedStep();
      }
      case "halt":
        halt(scope, process.keeper(), sigil.failure as Failure);
        return processExitedStep(either.left(runner.stateAs("failed").failure));
      case "lookup":
        accept(lookup(scope, sigil.key));
        return processInterpretedStep();
      case "poll":
        accept(poll(this.#resolve(sigil.future)));
        return processInterpretedStep();
      case "self":
        accept(self(runner));
        return processInterpretedStep();
      case "settle":
        settle(this.#resolve(sigil.futureSettle), sigil.result);
        accept(VOID);
        return processInterpretedStep();
      case "spawn": {
        const spawnedProcess = spawn(scope, this.#provideProcess(sigil.worker), sigil.descriptor);

        accept(spawnedProcess);
        return processInterpretedStep();
      }
      case "unbind":
        unbind(scope, sigil.key);
        accept(VOID);
        return processInterpretedStep();
      case "wait": {
        const future = this.#resolve(sigil.future);

        const settled = tryWait(future);
        if (option.isSome(settled)) {
          accept(settled.value);
          return processInterpretedStep();
        }

        wait(scope, process.keeper(), future);
        return processWaitingStep();
      }
      case "receive": {
        const received = tryReceive(scope, sigil.messageKey);

        if (option.isSome(received)) {
          accept(received.value);
          return processInterpretedStep();
        }

        receive(scope, process.keeper(), sigil.messageKey);
        return processWaitingStep();
      }
      case "send":
        send(scope, this.#resolve(sigil.scope), sigil.messageKey, sigil.value);
        accept(VOID);
        return processInterpretedStep();
    }
  }

  #provideProcess<Relic>(worker: Ritual<Relic>): ProvideRuntimeProcess {
    return (scopeRef, descriptor) => {
      const process = RuntimeProcess.create(scopeRef, worker, descriptor);

      this.#touch(process);

      return process.keeper();
    };
  }

  // oxlint-disable-next-line class-methods-use-this
  #touch(_token: RuntimeScope | RuntimeProcessHandle<unknown> | RuntimeFuture<unknown>): void {
    // Do nothing
  }

  #resolve<Relic>(scopeRef: ScopeRef<Relic>): RuntimeScope;
  #resolve<Relic>(processRef: ProcessRef<Relic>): RuntimeProcessHandle<Relic>;
  #resolve<Result>(futureKey: FutureKey<Result>): RuntimeFuture<Result>;
  #resolve<Result>(futureSettleKey: FutureSettleKey<Result>): RuntimeFuture<Result>;
  // oxlint-disable-next-line class-methods-use-this
  #resolve(token: unknown): unknown {
    return token;
  }

  readonly #rootScope: RuntimeScope;
  readonly #rootZoneObservers = new Set<ScopeZone>();
}

export type ScopeState = TaggedUnion<
  "status",
  {
    closed: ScopeInfo;
    closing: ScopeInfo;
    open: ScopeInfo;
  }
>;

export type ProcessState = TaggedUnion<
  "status",
  {
    closed: {};
    open: {
      readonly activity: "running" | "waiting";
    };
  }
>;

export type ScopeInfo = {
  readonly children: readonly ScopeRef<unknown>[];
  readonly descriptor: ScopeDescriptor;
  readonly parent: ScopeRef<unknown> | null;
  readonly zone: ScopeZone;
};

function fixRunningNext(next: RuntimeProcessNextEcho<Sigil>): RunningNext<Sigil> {
  return [next.sigil.kind, next.sigil, next.accept] as RunningNext<Sigil>;
}

function bind<Value>(scope: RuntimeScope, key: ContextKey<Value>, value: Value): void {
  scope.bind(key, value);
}

function branch(
  scope: RuntimeScope,
  provideProcess: ProvideRuntimeProcess,
  descriptor: ScopeDescriptor,
  zone: ScopeZone,
): RuntimeScope {
  return scope.branch(provideProcess, descriptor, zone);
}

function defer(process: RuntimeProcessRunner<unknown>, cleanup: CleanupTask): void {
  process.defer(cleanup);
}

function cancel(scope: RuntimeScope): void {
  scope.cancel();
}

function createFuture(scope: RuntimeScope): RuntimeFuture<unknown> {
  return scope.createFuture();
}

function halt(scope: RuntimeScope, process: RuntimeProcessKeeper, failure: Failure): void {
  scope.halt(process, failure);
}

function settle<Result>(future: RuntimeFuture<Result>, result: FutureResult<Result>): void {
  future.settle(result);
}

function spawn<Relic>(
  scope: RuntimeScope,
  provideProcess: ProvideRuntimeProcess,
  descriptor: ProcessDescriptor,
): ProcessRef<Relic> {
  return scope.spawn(provideProcess, descriptor);
}

function lookup<Value>(scope: RuntimeScope, key: ContextKey<Value>): option.Option<Value> {
  return scope.lookup(key);
}

function poll<Result>(future: RuntimeFuture<Result>): option.Option<FutureResult<Result>> {
  return future.poll();
}

function self(process: RuntimeProcessRunner<unknown>): SelfHandle<ScopeRef<unknown>> {
  return process.selfHandle();
}

function tryWait<Result>(future: RuntimeFuture<Result>): option.Option<FutureResult<Result>> {
  return future.poll();
}

function wait(
  scope: RuntimeScope,
  process: RuntimeProcessKeeper,
  future: RuntimeFuture<unknown>,
): void {
  scope.wait(process, future);
}

function unbind(scope: RuntimeScope, key: ContextKey<unknown>): void {
  scope.unbind(key);
}

function tryReceive<Value>(
  scope: RuntimeScope,
  messageKey: MessageKey<Value>,
): option.Option<Value> {
  return scope.tryReceive(messageKey);
}

function receive(
  scope: RuntimeScope,
  process: RuntimeProcessKeeper,
  messageKey: MessageKey<unknown>,
): void {
  scope.receive(process, messageKey);
}

function send<Value>(
  scope: RuntimeScope,
  targetScope: RuntimeScope,
  messageKey: MessageKey<Value>,
  value: Value,
): void {
  scope.send(targetScope, messageKey, value);
}

function scopeInfo(scope: RuntimeScope): ScopeInfo {
  return {
    children: scope.children,
    descriptor: scope.descriptor,
    parent: scope.parent,
    zone: scope.zone,
  };
}

type RunningNext<SigilItem extends Sigil> = SigilItem extends Sigil
  ? [SigilItem["kind"], SigilItem, (echo: Echo<SigilItem>) => void]
  : never;

const VOID: void = null as unknown as void;
