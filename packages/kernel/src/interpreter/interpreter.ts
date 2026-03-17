// oxlint-disable max-lines-per-function
// oxlint-disable class-methods-use-this
import type {
  BindSigil,
  BranchHandle,
  BranchSigil,
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
} from "#src/sigils";
import type {
  ContextKey,
  FailureShape,
  FutureKey,
  FutureResult,
  FutureSettleKey,
  ProcessRef,
  Ritual,
  ScopeRef,
  Wisp,
} from "#src/contracts";
import {
  blockedProcessStage,
  cededProcessStage,
  exitedProcessStage,
  interpretedProcessStage,
  resonatedProcessStage,
} from "./process-stage";
import type { Option } from "#src/utils";
import type { ProcessStage } from "./process-stage";
import type { RuntimeProcess } from "./runtime";
import { ScopeFrame } from "./scope-frame";
import { evoke } from "#src/contracts";
import { isSome } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";
import { standardScopeSpec } from "#src/scopes";
import { unitEcho } from "./step-support";

export class Interpreter {
  public constructor(protected readonly entry: Ritual<void>) {
    this.#rootFrame = ScopeFrame.create(entry, standardScopeSpec());
  }

  public step<Relic>(processRef: ProcessRef<Relic>): ProcessStage<Relic> {
    const process = this.#rootFrame.readProcess(processRef);

    if (process.status === "blocked") {
      return blockedProcessStage(processRef);
    }

    if (process.status === "exited") {
      return exitedProcessStage(processRef, process.result as FutureResult<Relic>);
    }

    if (process.hasQueuedContinuation) {
      process.resonate();
      return resonatedProcessStage(process.ref);
    }

    return this.#interpretWisp(process);
  }

  public get scopeRoot(): ScopeRef<unknown> {
    return this.#rootFrame.ref;
  }

  public get processRoot(): ProcessRef<unknown> {
    return this.#rootFrame.processRef;
  }

  public get isClosed(): boolean {
    return this.#rootFrame.isClosed;
  }

  public onProcessReady(listener: (process: ProcessRef<unknown>) => void): () => void {
    return this.#rootFrame.onProcessReady(listener);
  }

  protected onClose(
    _scope: ScopeRef<unknown>,
    _process: ProcessRef<unknown>,
    failure: FailureShape,
  ): Wisp<FailureShape> {
    return evoke(failure);
  }

  public spawn<Relic>(scope: ScopeRef<unknown>, worker: Ritual<Relic>): ProcessRef<Relic> {
    return this.#rootFrame.resolve(scope).spawn(worker, "tracked").ref;
  }

  public lookup<Value>(scope: ScopeRef<unknown>, contextKey: ContextKey<Value>): Option<Value> {
    return this.#rootFrame.resolve(scope).lookup(contextKey);
  }

  public poll<Result>(future: FutureKey<Result>): Option<FutureResult<Result>> {
    return this.#rootFrame.poll(future);
  }

  public wait<Result>(
    future: FutureKey<Result>,
    onSettled: (result: FutureResult<Result>) => void,
  ): void {
    this.#rootFrame.wait(future, onSettled);
  }

  // oxlint-disable-next-line max-statements
  #interpretWisp<Relic>(process: RuntimeProcess<Relic>): ProcessStage<Relic> {
    const current = process.wisp;

    if (current.bearing === "resting") {
      this.#rootFrame.completeProcess(process, current.relic);
      return exitedProcessStage(process.ref, process.result as FutureResult<Relic>);
    }

    const sigil = current.sigil as Sigil;

    switch (sigil.kind) {
      case "bind":
        this.#bind(process, sigil);
        this.#setContinuation(process, current.resonate, unitEcho());
        return interpretedProcessStage(process.ref);
      case "branch":
        this.#setContinuation(process, current.resonate, this.#branch(process, sigil));
        return interpretedProcessStage(process.ref);
      case "cede":
        this.#setContinuation(process, current.resonate, unitEcho());
        return cededProcessStage(process.ref);
      case "future":
        this.#setContinuation(process, current.resonate, this.#future(process));
        return interpretedProcessStage(process.ref);
      case "halt":
        this.#halt(process, sigil);
        return exitedProcessStage(process.ref, process.result as FutureResult<Relic>);
      case "lookup":
        this.#setContinuation(process, current.resonate, this.#lookup(process, sigil));
        return interpretedProcessStage(process.ref);
      case "poll":
        this.#setContinuation(process, current.resonate, this.#poll(sigil));
        return interpretedProcessStage(process.ref);
      case "self":
        this.#setContinuation(process, current.resonate, this.#self(process));
        return interpretedProcessStage(process.ref);
      case "settle":
        this.#settle(sigil);
        this.#setContinuation(process, current.resonate, unitEcho());
        return interpretedProcessStage(process.ref);
      case "spawn":
        this.#setContinuation(process, current.resonate, this.#spawn(process, sigil));
        return interpretedProcessStage(process.ref);
      case "unbind":
        this.#unbind(process, sigil);
        this.#setContinuation(process, current.resonate, unitEcho());
        return interpretedProcessStage(process.ref);
      case "wait": {
        const settled = this.poll(sigil.future);

        if (isSome(settled)) {
          this.#setContinuation(process, current.resonate, settled.value);
          return interpretedProcessStage(process.ref);
        }

        this.#wait(process, sigil);
        this.#primeContinuation(process, current.resonate);
        return blockedProcessStage(process.ref);
      }
      case "receive": {
        const received = this.#tryReceive(process, sigil);

        if (isSome(received)) {
          this.#setContinuation(process, current.resonate, received.value);
          return interpretedProcessStage(process.ref);
        }

        this.#receive(process, sigil);
        this.#primeContinuation(process, current.resonate);
        return blockedProcessStage(process.ref);
      }
      case "send":
        this.#send(process, sigil);
        this.#setContinuation(process, current.resonate, unitEcho());
        return interpretedProcessStage(process.ref);
    }
  }

  #bind(process: RuntimeProcess, sigil: BindSigil<unknown>): void {
    this.#rootFrame.resolve(process.scopeRef).bind(sigil.key, sigil.value);
  }

  #branch(process: RuntimeProcess, sigil: BranchSigil<unknown>): BranchHandle<unknown> {
    const branchFrame = this.#rootFrame.resolve(process.scopeRef).branch(sigil.entry, sigil.spec);
    return branchFrame.entryProcess.branchHandle();
  }

  #future(process: RuntimeProcess): readonly [FutureKey<unknown>, FutureSettleKey<unknown>] {
    const created = this.#rootFrame.resolve(process.scopeRef).createFuture<unknown>();
    return [created.key, created.settleKey];
  }

  #halt(_process: RuntimeProcess, _sigil: HaltSigil): void {
    notImplemented("Interpreter.halt sigil execution");
  }

  #settle(sigil: SettleSigil<unknown>): void {
    this.#rootFrame.settleFuture(sigil.futureSettle, sigil.result);
  }

  #spawn(process: RuntimeProcess, sigil: SpawnSigil<unknown>): ProcessRef<unknown> {
    const spawned = this.#rootFrame
      .resolve(process.scopeRef)
      .spawn(sigil.ritual, sigil.participation);
    return spawned.ref;
  }

  #lookup(process: RuntimeProcess, sigil: LookupSigil<unknown>): Option<unknown> {
    return this.lookup(process.scopeRef, sigil.key);
  }

  #poll(sigil: PollSigil<unknown>): Option<FutureResult<unknown>> {
    return this.poll(sigil.future);
  }

  #self(process: RuntimeProcess): SelfHandle<ScopeRef<unknown>> {
    return process.selfHandle();
  }

  #wait(process: RuntimeProcess, sigil: { readonly future: FutureKey<unknown> }): void {
    process.wait(this.#rootFrame.requireFuture(sigil.future));
  }

  #unbind(process: RuntimeProcess, sigil: UnbindSigil): void {
    this.#rootFrame.resolve(process.scopeRef).unbind(sigil.key);
  }

  #tryReceive(process: RuntimeProcess, sigil: ReceiveSigil<unknown>): Option<unknown> {
    return this.#rootFrame.resolve(process.scopeRef).tryReceive(sigil.messageKey);
  }

  #receive(process: RuntimeProcess, sigil: ReceiveSigil<unknown>): void {
    this.#rootFrame.resolve(process.scopeRef).receive(process.ref, sigil.messageKey);
  }

  #send(process: RuntimeProcess, sigil: SendSigil<unknown>): void {
    this.#rootFrame.resolve(process.scopeRef).send(sigil.scope, sigil.messageKey, sigil.value);
  }

  #setContinuation(
    process: RuntimeProcess,
    resonate: (echo: unknown) => Wisp<unknown>,
    echo: unknown,
  ): void {
    process.setContinuation(resonate, echo);
  }

  #primeContinuation(process: RuntimeProcess, resonate: (echo: unknown) => Wisp<unknown>): void {
    process.primeContinuation(resonate);
  }

  readonly #rootFrame: ScopeFrame;
}
