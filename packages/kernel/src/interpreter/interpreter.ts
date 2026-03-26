// oxlint-disable max-lines
import type { BranchHandle, SelfHandle, Sigil } from "#/sigils";
import type {
  ContextKey,
  FutureHandle,
  FutureKey,
  FutureResult,
  FutureSettleKey,
  MessageKey,
  ProcessDescriptor,
  ProcessRef,
  Resonance,
  Ritual,
  ScopeDescriptor,
  ScopeRef,
  SigilShape,
  StirringWisp,
} from "#/contracts";
import type { FutureSettler, RuntimeFuture } from "./runtime-future";
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
import { option } from "fp-ts";

export class Interpreter {
  // oxlint-disable-next-line class-methods-use-this
  public step<Relic>(processRef: ProcessRef<Relic>): ProcessStep<Relic> {
    const process = this.#narrow(processRef);

    switch (process.status) {
      case "waiting":
        return processWaitingStep(processRef);
      case "completed":
      case "canceled":
      case "failed":
        return processExitedStep(processRef, process.result!);
      case "running":
        if (process.hasQueuedContinuation) {
          return this.#resonateWisp(process);
        }

        return this.#interpretWisp(process);
    }
  }

  public observeRunnable(listener: RunnableListener): Unsubscribe {
    this.#runnableListeners.add(listener);

    return () => {
      this.#runnableListeners.delete(listener);
    };
  }

  public spawn<Relic>(scope: ScopeRef<unknown>, worker: Ritual<Relic>): ProcessRef<Relic> {
    const process = this.#narrow(scope).spawn(worker, { completionMode: "structural" });
    this.#touch(process);
    return process;
  }

  public lookup<Value>(
    scope: ScopeRef<unknown>,
    contextKey: ContextKey<Value>,
  ): option.Option<Value> {
    return this.#narrow(scope).lookup(contextKey);
  }

  public poll<Result>(future: FutureKey<Result>): option.Option<FutureResult<Result>> {
    return this.#narrow(future).poll();
  }

  public wait<Result>(future: FutureKey<Result>, onSettled: FutureSettler<Result>): void {
    this.#narrow(future).wait(onSettled);
  }

  public constructor(protected readonly entry: Ritual<void>) {
    this.#rootScope = RuntimeScope.create(
      entry,
      { failureMode: "contain" },
      {
        trackProcess: (process) => {
          if (process.status === "running") {
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
  #interpretWisp<Relic>(process: RuntimeProcess<Relic>): ProcessStep<Relic> {
    const scope = this.#narrow(process.scopeRef);
    const { sigil, resonate } = process.wisp as StirringWisp<Sigil, Relic>;

    switch (sigil.kind) {
      case "bind":
        bind(scope, sigil.key, sigil.value);
        setContinuation(process, resonate, null);
        return processInterpretedStep(process);
      case "branch":
        setContinuation(process, resonate, branch(scope, sigil.entry, sigil.descriptor));
        return processInterpretedStep(process);
      case "cede":
        setContinuation(process, resonate, null);
        return processCededStep(process);
      case "cancel":
        cancel(scope);
        return processExitedStep(process, process.result as FutureResult<Relic>);
      case "defer":
        defer(process, sigil.cleanup);
        setContinuation(process, resonate, null);
        return processInterpretedStep(process);
      case "future":
        setContinuation(process, resonate, createFuture(scope));
        return processInterpretedStep(process);
      case "halt":
        halt(process, sigil.failure as Failure);
        return processExitedStep(process, process.result as FutureResult<Relic>);
      case "lookup":
        setContinuation(process, resonate, lookup(scope, sigil.key));
        return processInterpretedStep(process);
      case "poll":
        setContinuation(process, resonate, poll(this.#narrow(sigil.future)));
        return processInterpretedStep(process);
      case "self":
        setContinuation(process, resonate, self(process));
        return processInterpretedStep(process);
      case "settle":
        settle(this.#narrow(sigil.futureSettle), sigil.result);
        setContinuation(process, resonate, null);
        return processInterpretedStep(process);
      case "spawn":
        setContinuation(process, resonate, spawn(scope, sigil.worker, sigil.descriptor));
        return processInterpretedStep(process);
      case "unbind":
        unbind(scope, sigil.key);
        setContinuation(process, resonate, null);
        return processInterpretedStep(process);
      case "wait": {
        const future = this.#narrow(sigil.future);

        const settled = tryWait(future);
        if (option.isSome(settled)) {
          setContinuation(process, resonate, settled.value);
          return processInterpretedStep(process);
        }

        wait(process, future);
        primeContinuation(process, resonate);
        return processWaitingStep(process);
      }
      case "receive": {
        const received = tryReceive(scope, sigil.messageKey);

        if (option.isSome(received)) {
          setContinuation(process, resonate, received.value);
          return processInterpretedStep(process);
        }

        receive(scope, process, sigil.messageKey);
        primeContinuation(process, resonate);
        return processWaitingStep(process);
      }
      case "send":
        send(scope, this.#narrow(sigil.scope), sigil.messageKey, sigil.value);
        setContinuation(process, resonate, null);
        return processInterpretedStep(process);
    }
  }

  // oxlint-disable-next-line class-methods-use-this
  #resonateWisp<Relic>(process: RuntimeProcess<Relic>): ProcessStep<Relic> {
    process.resonate();

    if (process.isClosed) {
      return processExitedStep(process, process.result as FutureResult<Relic>);
    }

    return processResonatedStep(process);
  }

  #onRunnable(process: RuntimeProcess<unknown>) {
    for (const listener of this.#runnableListeners) {
      listener(process);
    }
  }

  // oxlint-disable-next-line class-methods-use-this
  #touch(
    _token: ScopeRef<unknown> | ProcessRef<unknown> | FutureKey<unknown> | FutureSettleKey<unknown>,
  ): void {
    // Do nothing
  }

  #narrow<Relic>(scopeRef: ScopeRef<Relic>): RuntimeScope;
  #narrow<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic>;
  #narrow<Result>(futureKey: FutureKey<Result>): RuntimeFuture<Result>;
  #narrow<Result>(futureSettleKey: FutureSettleKey<Result>): RuntimeFuture<Result>;
  // oxlint-disable-next-line class-methods-use-this
  #narrow(token: unknown): unknown {
    return token;
  }

  readonly #rootScope: RuntimeScope;
  readonly #runnableListeners = new Set<RunnableListener>();
}

export type RunnableListener = (process: ProcessRef<unknown>) => void;

function bind<Value>(scope: RuntimeScope, key: ContextKey<Value>, value: Value): void {
  scope.bind(key, value);
}

function branch<Relic>(
  scope: RuntimeScope,
  entry: Ritual<Relic>,
  descriptor: ScopeDescriptor,
): BranchHandle<Relic> {
  const branchScope = scope.branch(entry, descriptor);
  // Need touch

  return {
    process: branchScope.entryProcess,
    scope: branchScope,
  } as BranchHandle<Relic>;
}

function defer(process: RuntimeProcess<unknown>, cleanup: Ritual<void>): void {
  process.defer((spawnCleanup) => {
    spawnCleanup(cleanup);
    // Need touch
  });
}

function cancel(scope: RuntimeScope): void {
  scope.cancel();
}

function createFuture(scope: RuntimeScope): FutureHandle<unknown> {
  return scope.createFuture().handle;
  // Need touch
}

function halt(process: RuntimeProcess<unknown>, failure: Failure): void {
  process.halt(failure);
}

function settle<Result>(future: RuntimeFuture<Result>, result: FutureResult<Result>): void {
  future.settle(result);
}

function spawn<Relic>(
  scope: RuntimeScope,
  worker: Ritual<Relic>,
  descriptor: ProcessDescriptor,
): ProcessRef<Relic> {
  return scope.spawn(worker, descriptor);
  // Need touch
}

function lookup<Value>(scope: RuntimeScope, key: ContextKey<Value>): option.Option<Value> {
  return scope.lookup(key);
}

function poll<Result>(future: RuntimeFuture<Result>): option.Option<FutureResult<Result>> {
  return future.poll();
}

function self(process: RuntimeProcess<unknown>): SelfHandle<ScopeRef<unknown>> {
  return process.selfHandle();
}

function tryWait<Result>(future: RuntimeFuture<Result>): option.Option<FutureResult<Result>> {
  return future.poll();
}

function wait(process: RuntimeProcess<unknown>, future: RuntimeFuture<unknown>): void {
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
  process: RuntimeProcess<unknown>,
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

function setContinuation(
  process: RuntimeProcess<unknown>,
  resonate: Resonance<SigilShape, unknown>,
  echo: unknown,
): void {
  process.setContinuation(resonate, echo);
}

function primeContinuation(
  process: RuntimeProcess<unknown>,
  resonate: Resonance<SigilShape, unknown>,
): void {
  process.primeContinuation(resonate);
}
