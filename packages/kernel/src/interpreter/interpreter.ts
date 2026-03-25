// oxlint-disable class-methods-use-this, max-lines
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
  ProcessDescriptor,
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

  public step<Relic>(processRef: ProcessRef<Relic>): ProcessStep<Relic> {
    const process = this.#narrowProcess(processRef);

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
    return this.#spawnIn(this.#narrowScope(scope), worker, { completionMode: "structural" });
  }

  public lookup<Value>(
    scope: ScopeRef<unknown>,
    contextKey: ContextKey<Value>,
  ): option.Option<Value> {
    return this.#narrowScope(scope).lookup(contextKey);
  }

  public poll<Result>(future: FutureKey<Result>): option.Option<FutureResult<Result>> {
    return this.#narrowFuture(future).poll();
  }

  public wait<Result>(future: FutureKey<Result>, onSettled: FutureSettler<Result>): void {
    this.#narrowFuture(future).wait(onSettled);
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
    // `Step` only reaches `#interpretWisp` when there is no queued continuation.
    // Process is not completed here, so the current wisp must still be stirring.
    const current = process.wisp as StirringWisp<Sigil, Relic>;
    const sigil = current.sigil as Sigil;

    switch (sigil.kind) {
      case "bind":
        this.#bind(process, sigil);
        this.#setContinuation(process, current.resonate, null);
        return processInterpretedStep(process);
      case "branch":
        this.#setContinuation(process, current.resonate, this.#branch(process, sigil));
        return processInterpretedStep(process);
      case "cede":
        this.#setContinuation(process, current.resonate, null);
        return processCededStep(process);
      case "cancel":
        this.#cancel(process, sigil);
        return processExitedStep(process, process.result as FutureResult<Relic>);
      case "defer":
        this.#defer(process, sigil);
        this.#setContinuation(process, current.resonate, null);
        return processInterpretedStep(process);
      case "future":
        this.#setContinuation(process, current.resonate, this.#future(process));
        return processInterpretedStep(process);
      case "halt":
        this.#halt(process, sigil);
        return processExitedStep(process, process.result as FutureResult<Relic>);
      case "lookup":
        this.#setContinuation(process, current.resonate, this.#lookup(process, sigil));
        return processInterpretedStep(process);
      case "poll":
        this.#setContinuation(process, current.resonate, this.#poll(sigil));
        return processInterpretedStep(process);
      case "self":
        this.#setContinuation(process, current.resonate, this.#self(process));
        return processInterpretedStep(process);
      case "settle":
        this.#settle(sigil);
        this.#setContinuation(process, current.resonate, null);
        return processInterpretedStep(process);
      case "spawn":
        this.#setContinuation(process, current.resonate, this.#spawn(process, sigil));
        return processInterpretedStep(process);
      case "unbind":
        this.#unbind(process, sigil);
        this.#setContinuation(process, current.resonate, null);
        return processInterpretedStep(process);
      case "wait": {
        const settled = this.#tryWait(sigil);

        if (option.isSome(settled)) {
          this.#setContinuation(process, current.resonate, settled.value);
          return processInterpretedStep(process);
        }

        this.#wait(process, sigil);
        this.#primeContinuation(process, current.resonate);
        return processWaitingStep(process);
      }
      case "receive": {
        const received = this.#tryReceive(process, sigil);

        if (option.isSome(received)) {
          this.#setContinuation(process, current.resonate, received.value);
          return processInterpretedStep(process);
        }

        this.#receive(process, sigil);
        this.#primeContinuation(process, current.resonate);
        return processWaitingStep(process);
      }
      case "send":
        this.#send(process, sigil);
        this.#setContinuation(process, current.resonate, null);
        return processInterpretedStep(process);
    }
  }

  #resonateWisp<Relic>(process: RuntimeProcess<Relic>): ProcessStep<Relic> {
    process.resonate();

    if (
      process.status === "completed" ||
      process.status === "failed" ||
      process.status === "canceled"
    ) {
      return processExitedStep(process, process.result as FutureResult<Relic>);
    }

    return processResonatedStep(process);
  }

  #bind(process: RuntimeProcess<unknown>, sigil: BindSigil<unknown>): void {
    this.#narrowScope(process.scopeRef).bind(sigil.key, sigil.value);
  }

  #branch(process: RuntimeProcess<unknown>, sigil: BranchSigil<unknown>): BranchHandle<unknown> {
    const branchScope = this.#narrowScope(process.scopeRef).branch(sigil.entry, sigil.descriptor);

    return {
      process: branchScope.entryProcess,
      scope: branchScope,
    };
  }

  #defer(process: RuntimeProcess<unknown>, sigil: DeferSigil): void {
    process.defer((spawn) => {
      spawn(sigil.cleanup);
    });
  }

  #cancel(process: RuntimeProcess<unknown>, _sigil: CancelSigil): void {
    this.#narrowScope(process.scopeRef).cancel();
  }

  #future(process: RuntimeProcess<unknown>): FutureHandle<unknown> {
    const scope = this.#narrowScope(process.scopeRef);
    return scope.createFuture().handle;
  }

  #halt(process: RuntimeProcess<unknown>, sigil: HaltSigil): void {
    process.halt(sigil.failure as Failure);
  }

  #settle(sigil: SettleSigil<unknown>): void {
    this.#narrowFutureSettleKey(sigil.futureSettle).settle(sigil.result);
  }

  #spawn(process: RuntimeProcess<unknown>, sigil: SpawnSigil<unknown>): ProcessRef<unknown> {
    return this.#spawnIn<unknown>(
      this.#narrowScope(process.scopeRef),
      sigil.worker,
      sigil.descriptor,
    );
  }

  #lookup(process: RuntimeProcess<unknown>, sigil: LookupSigil<unknown>): option.Option<unknown> {
    return this.#narrowScope(process.scopeRef).lookup(sigil.key);
  }

  #poll(sigil: PollSigil<unknown>): option.Option<FutureResult<unknown>> {
    return this.#narrowFuture(sigil.future).poll();
  }

  #self(process: RuntimeProcess<unknown>): SelfHandle<ScopeRef<unknown>> {
    return process.selfHandle();
  }

  #tryWait(sigil: WaitSigil<unknown>): option.Option<FutureResult<unknown>> {
    return this.#narrowFuture(sigil.future).poll();
  }

  #wait(process: RuntimeProcess<unknown>, sigil: WaitSigil<unknown>): void {
    process.wait(sigil.future);
  }

  #unbind(process: RuntimeProcess<unknown>, sigil: UnbindSigil): void {
    this.#narrowScope(process.scopeRef).unbind(sigil.key);
  }

  #tryReceive(
    process: RuntimeProcess<unknown>,
    sigil: ReceiveSigil<unknown>,
  ): option.Option<unknown> {
    return this.#narrowScope(process.scopeRef).tryReceive(sigil.messageKey);
  }

  #receive(process: RuntimeProcess<unknown>, sigil: ReceiveSigil<unknown>): void {
    this.#narrowScope(process.scopeRef).receive(process, sigil.messageKey);
  }

  #send(process: RuntimeProcess<unknown>, sigil: SendSigil<unknown>): void {
    const sourceScope = this.#narrowScope(process.scopeRef);
    const targetScope = this.#narrowScope(sigil.scope);

    sourceScope.send(targetScope, sigil.messageKey, sigil.value);
  }

  #setContinuation(
    process: RuntimeProcess<unknown>,
    resonate: Resonance<SigilShape, unknown>,
    echo: unknown,
  ): void {
    process.setContinuation(resonate, echo);
  }

  #primeContinuation(
    process: RuntimeProcess<unknown>,
    resonate: Resonance<SigilShape, unknown>,
  ): void {
    process.primeContinuation(resonate);
  }

  #spawnIn<Relic>(
    scope: RuntimeScope,
    worker: Ritual<Relic>,
    descriptor: ProcessDescriptor,
  ): ProcessRef<Relic> {
    return scope.spawn(worker, descriptor);
  }

  #narrowScope<Relic>(scopeRef: ScopeRef<Relic>): RuntimeScope {
    return scopeRef as RuntimeScope;
  }

  #narrowProcess<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic> {
    return processRef as RuntimeProcess<Relic>;
  }

  #narrowFuture<Result>(future: FutureKey<Result>): RuntimeFuture<Result> {
    return future as RuntimeFuture<Result>;
  }

  #narrowFutureSettleKey<Result>(future: FutureSettleKey<Result>): RuntimeFuture<Result> {
    return future as RuntimeFuture<Result>;
  }

  readonly #rootScope: RuntimeScope;
  readonly #runnableListeners = new Set<RunnableListener>();
}

export type RunnableListener = (process: ProcessRef<unknown>) => void;
