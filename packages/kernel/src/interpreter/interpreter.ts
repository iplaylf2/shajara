// oxlint-disable max-lines
import type {
  BindSigil,
  BranchHandle,
  BranchSigil,
  CancelSigil,
  DeferSigil,
  HaltSigil,
  LookupSigil,
  PollSigil,
  ReceiveSigil,
  SelfHandle,
  SendSigil,
  SettleSigil,
  Sigil,
  SpawnSigil,
  UnbindSigil,
  WaitSigil,
} from "#/sigils";
import type {
  ContextKey,
  FutureHandle,
  FutureKey,
  FutureResult,
  FutureSettleKey,
  ProcessRef,
  Resonance,
  Ritual,
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
  public constructor(protected readonly entry: Ritual<void>) {
    this.#rootScope = RuntimeScope.create(
      entry,
      { failureMode: "contain" },
      {
        trackProcess: (process) => {
          if (process.status !== "running") {
            return;
          }

          for (const listener of this.#runnableListeners) {
            listener(process);
          }
        },
      },
    );
  }

  // oxlint-disable-next-line class-methods-use-this
  public step<Relic>(processRef: ProcessRef<Relic>): ProcessStep<Relic> {
    const process = narrowProcess(processRef);

    switch (process.status) {
      case "waiting":
        return processWaitingStep(processRef);
      case "completed":
      case "canceled":
      case "failed":
        return processExitedStep(processRef, process.result!);
      case "running":
        if (process.hasQueuedContinuation) {
          return resonateWisp(process);
        }

        return interpretWisp(process);
    }
  }

  public observeRunnable(listener: RunnableListener): Unsubscribe {
    this.#runnableListeners.add(listener);

    return () => {
      this.#runnableListeners.delete(listener);
    };
  }

  // oxlint-disable-next-line class-methods-use-this
  public spawn<Relic>(scope: ScopeRef<unknown>, worker: Ritual<Relic>): ProcessRef<Relic> {
    return narrowScope(scope).spawn(worker, { completionMode: "structural" });
  }

  // oxlint-disable-next-line class-methods-use-this
  public lookup<Value>(
    scope: ScopeRef<unknown>,
    contextKey: ContextKey<Value>,
  ): option.Option<Value> {
    return narrowScope(scope).lookup(contextKey);
  }

  // oxlint-disable-next-line class-methods-use-this
  public poll<Result>(future: FutureKey<Result>): option.Option<FutureResult<Result>> {
    return narrowFuture(future).poll();
  }

  // oxlint-disable-next-line class-methods-use-this
  public wait<Result>(future: FutureKey<Result>, onSettled: FutureSettler<Result>): void {
    narrowFuture(future).wait(onSettled);
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
  readonly #rootScope: RuntimeScope;
  readonly #runnableListeners = new Set<RunnableListener>();
}

export type RunnableListener = (process: ProcessRef<unknown>) => void;

// oxlint-disable-next-line max-lines-per-function, max-statements
function interpretWisp<Relic>(process: RuntimeProcess<Relic>): ProcessStep<Relic> {
  // `step` only reaches `interpretWisp` when there is no queued continuation.
  // Process is not completed here, so the current wisp must still be stirring.
  const current = process.wisp as StirringWisp<Sigil, Relic>;
  const sigil = current.sigil as Sigil;

  switch (sigil.kind) {
    case "bind":
      bind(process, sigil);
      setContinuation(process, current.resonate, null);
      return processInterpretedStep(process);
    case "branch":
      setContinuation(process, current.resonate, branch(process, sigil));
      return processInterpretedStep(process);
    case "cede":
      setContinuation(process, current.resonate, null);
      return processCededStep(process);
    case "cancel":
      cancel(process, sigil);
      return processExitedStep(process, process.result as FutureResult<Relic>);
    case "defer":
      defer(process, sigil);
      setContinuation(process, current.resonate, null);
      return processInterpretedStep(process);
    case "future":
      setContinuation(process, current.resonate, createFuture(process));
      return processInterpretedStep(process);
    case "halt":
      halt(process, sigil);
      return processExitedStep(process, process.result as FutureResult<Relic>);
    case "lookup":
      setContinuation(process, current.resonate, lookup(process, sigil));
      return processInterpretedStep(process);
    case "poll":
      setContinuation(process, current.resonate, poll(sigil));
      return processInterpretedStep(process);
    case "self":
      setContinuation(process, current.resonate, self(process));
      return processInterpretedStep(process);
    case "settle":
      settle(sigil);
      setContinuation(process, current.resonate, null);
      return processInterpretedStep(process);
    case "spawn":
      setContinuation(process, current.resonate, spawn(process, sigil));
      return processInterpretedStep(process);
    case "unbind":
      unbind(process, sigil);
      setContinuation(process, current.resonate, null);
      return processInterpretedStep(process);
    case "wait": {
      const settled = tryWait(sigil);

      if (option.isSome(settled)) {
        setContinuation(process, current.resonate, settled.value);
        return processInterpretedStep(process);
      }

      wait(process, sigil);
      primeContinuation(process, current.resonate);
      return processWaitingStep(process);
    }
    case "receive": {
      const received = tryReceive(process, sigil);

      if (option.isSome(received)) {
        setContinuation(process, current.resonate, received.value);
        return processInterpretedStep(process);
      }

      receive(process, sigil);
      primeContinuation(process, current.resonate);
      return processWaitingStep(process);
    }
    case "send":
      send(process, sigil);
      setContinuation(process, current.resonate, null);
      return processInterpretedStep(process);
  }
}

function resonateWisp<Relic>(process: RuntimeProcess<Relic>): ProcessStep<Relic> {
  process.resonate();

  if (process.isClosed) {
    return processExitedStep(process, process.result as FutureResult<Relic>);
  }

  return processResonatedStep(process);
}

function bind(process: RuntimeProcess<unknown>, sigil: BindSigil<unknown>): void {
  narrowScope(process.scopeRef).bind(sigil.key, sigil.value);
}

function branch(
  process: RuntimeProcess<unknown>,
  sigil: BranchSigil<unknown>,
): BranchHandle<unknown> {
  const branchScope = narrowScope(process.scopeRef).branch(sigil.entry, sigil.descriptor);

  return {
    process: branchScope.entryProcess,
    scope: branchScope,
  };
}

function defer(process: RuntimeProcess<unknown>, sigil: DeferSigil): void {
  process.defer((spawnCleanup) => {
    spawnCleanup(sigil.cleanup);
  });
}

function cancel(process: RuntimeProcess<unknown>, _sigil: CancelSigil): void {
  narrowScope(process.scopeRef).cancel();
}

function createFuture(process: RuntimeProcess<unknown>): FutureHandle<unknown> {
  return narrowScope(process.scopeRef).createFuture().handle;
}

function halt(process: RuntimeProcess<unknown>, sigil: HaltSigil): void {
  process.halt(sigil.failure as Failure);
}

function settle(sigil: SettleSigil<unknown>): void {
  narrowFutureSettleKey(sigil.futureSettle).settle(sigil.result);
}

function spawn(process: RuntimeProcess<unknown>, sigil: SpawnSigil<unknown>): ProcessRef<unknown> {
  return narrowScope(process.scopeRef).spawn(sigil.worker, sigil.descriptor);
}

function lookup(
  process: RuntimeProcess<unknown>,
  sigil: LookupSigil<unknown>,
): option.Option<unknown> {
  return narrowScope(process.scopeRef).lookup(sigil.key);
}

function poll(sigil: PollSigil<unknown>): option.Option<FutureResult<unknown>> {
  return narrowFuture(sigil.future).poll();
}

function self(process: RuntimeProcess<unknown>): SelfHandle<ScopeRef<unknown>> {
  return process.selfHandle();
}

function tryWait(sigil: WaitSigil<unknown>): option.Option<FutureResult<unknown>> {
  return narrowFuture(sigil.future).poll();
}

function wait(process: RuntimeProcess<unknown>, sigil: WaitSigil<unknown>): void {
  process.wait(sigil.future);
}

function unbind(process: RuntimeProcess<unknown>, sigil: UnbindSigil): void {
  narrowScope(process.scopeRef).unbind(sigil.key);
}

function tryReceive(
  process: RuntimeProcess<unknown>,
  sigil: ReceiveSigil<unknown>,
): option.Option<unknown> {
  return narrowScope(process.scopeRef).tryReceive(sigil.messageKey);
}

function receive(process: RuntimeProcess<unknown>, sigil: ReceiveSigil<unknown>): void {
  narrowScope(process.scopeRef).receive(process, sigil.messageKey);
}

function send(process: RuntimeProcess<unknown>, sigil: SendSigil<unknown>): void {
  const sourceScope = narrowScope(process.scopeRef);
  const targetScope = narrowScope(sigil.scope);

  sourceScope.send(targetScope, sigil.messageKey, sigil.value);
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

function narrowScope<Relic>(scopeRef: ScopeRef<Relic>): RuntimeScope {
  return scopeRef as RuntimeScope;
}

function narrowProcess<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic> {
  return processRef as RuntimeProcess<Relic>;
}

function narrowFuture<Result>(futureKey: FutureKey<Result>): RuntimeFuture<Result> {
  return futureKey as RuntimeFuture<Result>;
}

function narrowFutureSettleKey<Result>(
  futureSettleKey: FutureSettleKey<Result>,
): RuntimeFuture<Result> {
  return futureSettleKey as RuntimeFuture<Result>;
}
