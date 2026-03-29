// oxlint-disable max-lines
import type {
  CleanupTask,
  ProvideRuntimeProcess,
  RuntimeProcessHandle,
  RuntimeProcessKeeper,
  RuntimeProcessRunner,
  RuntimeProcessRunningNext,
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
import type { Failure } from "#/failures";
import type { ProcessStep } from "./process-step";
import { RuntimeProcess } from "./runtime-process";
import { RuntimeScope } from "./runtime-scope";
import type { Unsubscribe } from "#/interpreter-kit";
import { canceledFailure } from "#/failures";

export class Interpreter {
  // oxlint-disable-next-line class-methods-use-this
  public step<Relic>(processRef: ProcessRef<Relic>): ProcessStep<Relic> {
    const process = this.#resolve(processRef);
    const runner = process.runner();

    switch (runner.status) {
      case "waiting":
        return processWaitingStep(processRef);
      case "completed":
        return processExitedStep(processRef, either.right(runner.stateAs(runner.status).result));
      case "canceled":
        return processExitedStep(processRef, either.left(canceledFailure));
      case "failed":
        return processExitedStep(processRef, either.left(runner.stateAs(runner.status).failure));
      case "running": {
        const next = runner.stateAs(runner.status).next();

        if (next) {
          return this.#interpret(process, next);
        }
        return processResonatedStep(process);
      }
    }
  }

  public observeRunnable(listener: RunnableListener): Unsubscribe {
    this.#runnableListeners.add(listener);

    return () => {
      this.#runnableListeners.delete(listener);
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

  public wait<Result>(future: FutureKey<Result>, onSettled: FutureSettler<Result>): void {
    this.#resolve(future).wait(onSettled);
  }

  public constructor(protected readonly entry: Ritual<void>) {
    this.#rootScope = RuntimeScope.create(
      this.#provideProcess(entry),
      { failureMode: "contain" },
      {
        trackProcess: (processRef) => {
          const process = this.#resolve(processRef);

          if (process.runner().status === "running") {
            this.#onRunnable(process);
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

  // oxlint-disable-next-line max-lines-per-function, max-statements
  #interpret<Relic>(
    process: RuntimeProcessHandle<Relic>,
    next: RuntimeProcessRunningNext<Sigil>,
  ): ProcessStep<Relic> {
    const scope = this.#resolve(process.scopeRef);
    const runner = process.runner();

    const [kind, sigil, accept] = fixRunningNext(next);
    switch (kind) {
      case "bind":
        bind(scope, sigil.key, sigil.value);
        accept(VOID);
        return processInterpretedStep(process);
      case "branch": {
        const branchScope = branch(scope, this.#provideProcess(sigil.entry), sigil.descriptor);
        this.#touch(branchScope);

        accept({
          process: branchScope.entryProcess,
          scope: branchScope,
        });
        return processInterpretedStep(process);
      }
      case "cede":
        accept(VOID);
        return processCededStep(process);
      case "cancel":
        cancel(scope);
        return processExitedStep(process, either.left(canceledFailure));
      case "defer":
        defer(runner, (spawnCleanup) => {
          spawnCleanup(this.#provideProcess(sigil.cleanup));
        });

        accept(VOID);
        return processInterpretedStep(process);
      case "future": {
        const future = createFuture(scope);
        this.#touch(future);

        accept(future.handle());
        return processInterpretedStep(process);
      }
      case "halt":
        halt(runner, sigil.failure as Failure);
        return processExitedStep(process, either.left(runner.stateAs("failed").failure));
      case "lookup":
        accept(lookup(scope, sigil.key));
        return processInterpretedStep(process);
      case "poll":
        accept(poll(this.#resolve(sigil.future)));
        return processInterpretedStep(process);
      case "self":
        accept(self(runner));
        return processInterpretedStep(process);
      case "settle":
        settle(this.#resolve(sigil.futureSettle), sigil.result);
        accept(VOID);
        return processInterpretedStep(process);
      case "spawn": {
        const spawnedProcess = spawn(scope, this.#provideProcess(sigil.worker), sigil.descriptor);

        accept(spawnedProcess);
        return processInterpretedStep(process);
      }
      case "unbind":
        unbind(scope, sigil.key);
        accept(VOID);
        return processInterpretedStep(process);
      case "wait": {
        const future = this.#resolve(sigil.future);

        const settled = tryWait(future);
        if (option.isSome(settled)) {
          accept(settled.value);
          return processInterpretedStep(process);
        }

        wait(runner, future);
        return processWaitingStep(process);
      }
      case "receive": {
        const received = tryReceive(scope, sigil.messageKey);

        if (option.isSome(received)) {
          accept(received.value);
          return processInterpretedStep(process);
        }

        receive(scope, process.keeper(), sigil.messageKey);
        return processWaitingStep(process);
      }
      case "send":
        send(scope, this.#resolve(sigil.scope), sigil.messageKey, sigil.value);
        accept(VOID);
        return processInterpretedStep(process);
    }
  }

  #provideProcess<Relic>(worker: Ritual<Relic>): ProvideRuntimeProcess {
    return (scopeRef, descriptor) => {
      const process = RuntimeProcess.create(scopeRef, worker, descriptor);

      this.#touch(process);

      return process.keeper();
    };
  }

  #onRunnable(process: ProcessRef<unknown>) {
    for (const listener of this.#runnableListeners) {
      listener(process);
    }
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
  readonly #runnableListeners = new Set<RunnableListener>();
}

export type RunnableListener = (process: ProcessRef<unknown>) => void;

function fixRunningNext(next: RuntimeProcessRunningNext<Sigil>): RunningNext<Sigil> {
  const [sigil, accept] = next;
  return [sigil.kind, sigil, accept] as RunningNext<Sigil>;
}

function bind<Value>(scope: RuntimeScope, key: ContextKey<Value>, value: Value): void {
  scope.bind(key, value);
}

function branch(
  scope: RuntimeScope,
  provideProcess: ProvideRuntimeProcess,
  descriptor: ScopeDescriptor,
): RuntimeScope {
  return scope.branch(provideProcess, descriptor);
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

function halt(process: RuntimeProcessRunner<unknown>, failure: Failure): void {
  process.halt(failure);
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

function wait(process: RuntimeProcessRunner<unknown>, future: RuntimeFuture<unknown>): void {
  process.wait(future);
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

type RunningNext<SigilItem extends Sigil> = SigilItem extends Sigil
  ? [SigilItem["kind"], SigilItem, (echo: Echo<SigilItem>) => void]
  : never;

const VOID: void = null as unknown as void;
