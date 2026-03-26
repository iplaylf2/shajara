// oxlint-disable max-lines
import type {
  ContextKey,
  Echo,
  FutureKey,
  FutureResult,
  FutureSettleKey,
  MessageKey,
  ProcessRef,
  Resonance,
  Ritual,
  ScopeRef,
  SigilShape,
  StirringWisp,
} from "#/contracts";
import type { FutureSettler, RuntimeFuture } from "./runtime-future";
import type { ProcessDescriptor, ScopeDescriptor, SelfHandle, Sigil } from "#/sigils";
import {
  processCededStep,
  processExitedStep,
  processInterpretedStep,
  processResonatedStep,
  processWaitingStep,
} from "./process-step";
import type { CleanupTask } from "./runtime-process";
import type { Failure } from "#/failures";
import type { ProcessStep } from "./process-step";
import { RuntimeProcess } from "./runtime-process";
import { RuntimeScope } from "./runtime-scope";
import type { Unsubscribe } from "#/interpreter-kit";
import { option } from "fp-ts";

export class Interpreter {
  // oxlint-disable-next-line class-methods-use-this
  public step<Relic>(processRef: ProcessRef<Relic>): ProcessStep<Relic> {
    const process = this.#resolve(processRef);

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
    const process = this.#resolve(scope).spawn(worker, { completionMode: "structural" });
    this.#touch(process);
    return process;
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
    const scope = this.#resolve(process.scopeRef);

    const [kind, sigil, resonate] = fixedStirringWisp(
      process.wisp as StirringWisp<SigilShape, Relic>,
    );
    switch (kind) {
      case "bind":
        bind(scope, sigil.key, sigil.value);
        setContinuation(process, resonate, VOID);
        return processInterpretedStep(process);
      case "branch": {
        const branchScope = branch(scope, sigil.entry, sigil.descriptor);
        this.#touch(branchScope);

        setContinuation(process, resonate, {
          process: branchScope.entryProcess,
          scope: branchScope,
        });
        return processInterpretedStep(process);
      }
      case "cede":
        setContinuation(process, resonate, VOID);
        return processCededStep(process);
      case "cancel":
        cancel(scope);
        return processExitedStep(process, process.result!);
      case "defer":
        defer(process, (spawnCleanup) => {
          const cleanupProcess = spawnCleanup(sigil.cleanup);

          this.#touch(cleanupProcess);
        });

        setContinuation(process, resonate, VOID);
        return processInterpretedStep(process);
      case "future": {
        const future = createFuture(scope);
        this.#touch(future);

        setContinuation(process, resonate, future.handle);
        return processInterpretedStep(process);
      }
      case "halt":
        halt(process, sigil.failure as Failure);
        return processExitedStep(process, process.result!);
      case "lookup":
        setContinuation(process, resonate, lookup(scope, sigil.key));
        return processInterpretedStep(process);
      case "poll":
        setContinuation(process, resonate, poll(this.#resolve(sigil.future)));
        return processInterpretedStep(process);
      case "self":
        setContinuation(process, resonate, self(process));
        return processInterpretedStep(process);
      case "settle":
        settle(this.#resolve(sigil.futureSettle), sigil.result);
        setContinuation(process, resonate, VOID);
        return processInterpretedStep(process);
      case "spawn": {
        const spawnedProcess = spawn(scope, sigil.worker, sigil.descriptor);
        this.#touch(spawnedProcess);

        setContinuation(process, resonate, spawnedProcess);
        return processInterpretedStep(process);
      }
      case "unbind":
        unbind(scope, sigil.key);
        setContinuation(process, resonate, VOID);
        return processInterpretedStep(process);
      case "wait": {
        const future = this.#resolve(sigil.future);

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
        send(scope, this.#resolve(sigil.scope), sigil.messageKey, sigil.value);
        setContinuation(process, resonate, VOID);
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

  #resolve<Relic>(scopeRef: ScopeRef<Relic>): RuntimeScope;
  #resolve<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic>;
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

function fixedStirringWisp<Relic>(
  wisp: StirringWisp<SigilShape, Relic>,
): FixedStirringWisp<Sigil, Relic> {
  return [wisp.sigil.kind, wisp.sigil, wisp.resonate] as FixedStirringWisp<Sigil, Relic>;
}

function bind<Value>(scope: RuntimeScope, key: ContextKey<Value>, value: Value): void {
  scope.bind(key, value);
}

function branch<Relic>(
  scope: RuntimeScope,
  entry: Ritual<Relic>,
  descriptor: ScopeDescriptor,
): RuntimeScope {
  return scope.branch(entry, descriptor);
}

function defer(process: RuntimeProcess<unknown>, cleanup: CleanupTask): void {
  process.defer(cleanup);
}

function cancel(scope: RuntimeScope): void {
  scope.cancel();
}

function createFuture(scope: RuntimeScope): RuntimeFuture<unknown> {
  return scope.createFuture();
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

function setContinuation<SigilItem extends SigilShape>(
  process: RuntimeProcess<unknown>,
  resonate: Resonance<SigilItem, unknown>,
  echo: Echo<SigilItem>,
): void {
  process.setContinuation(resonate, echo);
}

function primeContinuation(
  process: RuntimeProcess<unknown>,
  resonate: Resonance<SigilShape, unknown>,
): void {
  process.primeContinuation(resonate);
}

type FixedStirringWisp<SigilItem extends SigilShape, Relic> = SigilItem extends SigilShape
  ? [
      SigilItem["kind"],
      StirringWisp<SigilItem, Relic>["sigil"],
      StirringWisp<SigilItem, Relic>["resonate"],
    ]
  : never;

const VOID: void = null as unknown as void;
