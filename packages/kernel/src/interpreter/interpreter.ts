// oxlint-disable class-methods-use-this
import type {
  ContextKey,
  FailureShape,
  FutureKey,
  FutureResult,
  ProcessRef,
  Ritual,
  ScopeRef,
  SigilShape,
  StirringWisp,
  Wisp,
} from "#src/contracts";
import {
  blockOnFuture,
  createFuture,
  createProcess,
  createProcessRef,
  settleFuture,
} from "./runtime";
import { branchDescriptor, selfDescriptor } from "./runtime-access";
import type { Option } from "#src/utils";
import type { ProcessStep } from "./process-step";
import type { RuntimeProcess } from "./runtime";
import { ScopeFrame } from "./scope-frame";
import type { Sigil } from "#src/sigils";
import { evoke } from "#src/contracts";
import { isSome } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";
import { standardScopeSpec } from "#src/scopes";
import { unitEcho } from "./step-support";

const PROCESS_COUNT_EMPTY = 0;

export class Interpreter {
  public constructor(protected readonly entry: Ritual<void>) {
    this.#rootFrame = ScopeFrame.create(standardScopeSpec(), (frame) =>
      this.#createProcess(frame, entry, "tracked"),
    );
  }

  public step<Relic>(processRef: ProcessRef<Relic>): ProcessStep<Relic> {
    const process = this.#readProcess(processRef);

    if (process.status === "blocked") {
      return { kind: "blocked", process: processRef };
    }

    if (process.status === "exited") {
      return {
        kind: "exited",
        process: processRef,
        result: process.result as FutureResult<Relic>,
      };
    }

    return this.#advanceProcess(process);
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

  protected onReady(_process: ProcessRef<unknown>): void {
    //
  }

  protected onClose(
    _scope: ScopeRef<unknown>,
    _process: ProcessRef<unknown>,
    failure: FailureShape,
  ): Wisp<FailureShape> {
    return evoke(failure);
  }

  public spawn<Relic>(scope: ScopeRef<unknown>, worker: Ritual<Relic>): ProcessRef<Relic> {
    return this.#createProcess(this.#rootFrame.resolve(scope), worker, "tracked").ref;
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

  #advanceProcess<Relic>(process: RuntimeProcess<Relic>): ProcessStep<Relic> {
    const processRef = process.ref;
    const current = process.wisp;

    if (current.bearing === "resting") {
      return this.#rootFrame.completeProcess(process, current.relic);
    }

    const sigil = current.sigil as Sigil;

    switch (sigil.kind) {
      case "bind":
        this.#rootFrame.resolve(process.scope.ref).bind(sigil.key, sigil.value);
        return this.#cedeProcess(processRef, process, current.resonate(unitEcho()));
      case "branch":
        return this.#branchProcess(processRef, process, current, sigil);
      case "cede":
        return this.#cedeProcess(processRef, process, current.resonate(unitEcho()));
      case "future":
        return this.#createFutureSlot(processRef, process, current);
      case "halt":
        return this.#rootFrame.failProcess(process, sigil.failure);
      case "lookup":
        return this.#cedeProcess(
          processRef,
          process,
          current.resonate(this.lookup(process.scope.ref, sigil.key)),
        );
      case "poll":
        return this.#cedeProcess(processRef, process, current.resonate(this.poll(sigil.future)));
      case "self":
        return this.#cedeProcess(processRef, process, current.resonate(selfDescriptor(process)));
      case "settle":
        return this.#settleProcessFuture(processRef, process, current, sigil);
      case "spawn":
        return this.#spawnProcess(processRef, process, current, sigil);
      case "unbind":
        this.#rootFrame.resolve(process.scope.ref).unbind(sigil.key);
        return this.#cedeProcess(processRef, process, current.resonate(unitEcho()));
      case "wait":
        return this.#waitOnFuture(processRef, process, current, sigil.future);
      case "receive":
        return notImplemented("Interpreter.receive sigil execution");
      case "send":
        return notImplemented("Interpreter.send sigil execution");
    }
  }

  #branchProcess<Relic>(
    processRef: ProcessRef<Relic>,
    process: RuntimeProcess<Relic>,
    current: StirringWisp<SigilShape, unknown>,
    sigil: Extract<Sigil, { kind: "branch" }>,
  ): ProcessStep<Relic> {
    const branchFrame = this.#rootFrame
      .resolve(process.scope.ref)
      .branch(sigil.spec, (frame) => this.#createProcess(frame, sigil.entry, "tracked"));
    const branchProcess = this.#readProcess(branchFrame.processRef);
    return this.#cedeProcess(
      processRef,
      process,
      current.resonate(branchDescriptor(branchProcess, branchFrame.runtime)),
    );
  }

  #createFutureSlot<Relic>(
    processRef: ProcessRef<Relic>,
    process: RuntimeProcess<Relic>,
    current: StirringWisp<SigilShape, unknown>,
  ): ProcessStep<Relic> {
    const created = createFuture<unknown>();
    this.#rootFrame.registerFuture(created.future);
    return this.#cedeProcess(
      processRef,
      process,
      current.resonate([created.key, created.settleKey]),
    );
  }

  #settleProcessFuture<Relic>(
    processRef: ProcessRef<Relic>,
    process: RuntimeProcess<Relic>,
    current: StirringWisp<SigilShape, unknown>,
    sigil: Extract<Sigil, { kind: "settle" }>,
  ): ProcessStep<Relic> {
    const future = this.#rootFrame.requireFutureBySettle(sigil.futureSettle);
    const unblocked = settleFuture(future, sigil.result as FutureResult<unknown>);

    for (const readyProcess of unblocked) {
      this.onReady(readyProcess.ref);
    }

    return this.#cedeProcess(processRef, process, current.resonate(unitEcho()));
  }

  #spawnProcess<Relic>(
    processRef: ProcessRef<Relic>,
    process: RuntimeProcess<Relic>,
    current: StirringWisp<SigilShape, unknown>,
    sigil: Extract<Sigil, { kind: "spawn" }>,
  ): ProcessStep<Relic> {
    const spawned = this.#createProcess(
      this.#rootFrame.resolve(process.scope.ref),
      sigil.ritual,
      sigil.participation,
    );
    return this.#cedeProcess(processRef, process, current.resonate(spawned.ref));
  }

  #waitOnFuture<Relic>(
    processRef: ProcessRef<Relic>,
    process: RuntimeProcess<Relic>,
    current: StirringWisp<SigilShape, unknown>,
    futureRef: FutureKey<unknown>,
  ): ProcessStep<Relic> {
    const settled = this.#rootFrame.poll(futureRef);

    if (isSome(settled)) {
      return this.#cedeProcess(processRef, process, current.resonate(settled.value));
    }

    blockOnFuture(process, this.#rootFrame.requireFuture(futureRef), current.resonate);

    return { kind: "blocked", process: processRef };
  }

  #cedeProcess<Relic>(
    processRef: ProcessRef<Relic>,
    process: RuntimeProcess,
    next: Wisp<unknown>,
  ): ProcessStep<Relic> {
    process.wisp = next;
    return { kind: "ceded", process: processRef };
  }

  #createProcess<Relic>(
    frame: ScopeFrame,
    ritual: Ritual<Relic>,
    participation: "tracked" | "auxiliary",
  ): RuntimeProcess<Relic> {
    const scope = frame.runtime;
    const ref = this.#createProcessRefOf<Relic>(frame);

    if (this.#isEntryProcess(frame)) {
      this.#rootFrame.registerFuture(scope.exitFuture);
    }

    const process = this.#registerProcess(createProcess(scope, ritual, participation, ref));
    this.onReady(process.ref);
    return process;
  }

  #createProcessRefOf<Relic>(frame: ScopeFrame): ProcessRef<Relic> {
    if (this.#isEntryProcess(frame)) {
      return frame.processRef as ProcessRef<Relic>;
    }

    return createProcessRef<Relic>();
  }

  #isEntryProcess(frame: ScopeFrame): boolean {
    return frame.runtime.processes.size === PROCESS_COUNT_EMPTY;
  }

  #readProcess<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic> {
    return this.#rootFrame.readProcess(processRef);
  }

  #registerProcess<Relic>(process: RuntimeProcess<Relic>): RuntimeProcess<Relic> {
    return this.#rootFrame.registerProcess(process);
  }
  readonly #rootFrame: ScopeFrame;
}

export type * from "./process-step";
