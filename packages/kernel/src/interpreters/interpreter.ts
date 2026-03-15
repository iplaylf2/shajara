// oxlint-disable class-methods-use-this
import type { FutureKey, FutureResult, ProcessRef, Ritual, ScopeRef, Wisp } from "#src/contracts";
import type { Failure } from "#src/failures";
import { notImplemented } from "#src/internal/not-implemented.js";
import { wisp } from "#src/internal/fp";

export abstract class Interpreter {
  public constructor(protected readonly entry: Ritual<void>) {}

  public perform<Relic>(_process: ProcessRef<Relic>): ProcessState<Relic> {
    return notImplemented("");
  }

  public spawn<Relic>(_scope: ScopeRef<unknown>, _worker: Ritual<Relic>): ProcessRef<Relic> {
    return notImplemented("");
  }

  public observe<Result>(_future: FutureKey<Result>): FutureHandle<Result> {
    return notImplemented("");
  }

  public get scopeRoot(): ScopeRef<unknown> {
    return notImplemented("");
  }

  public get processRoot(): ProcessRef<unknown> {
    return notImplemented("");
  }

  public get isClosed(): boolean {
    return notImplemented("");
  }

  protected onReady(_process: ProcessRef<unknown>): void {
    //
  }

  // oxlint-disable-next-line class-methods-use-this
  protected onClose(
    _scope: ScopeRef<unknown>,
    _process: ProcessRef<unknown>,
    failure: Failure,
  ): Wisp<Failure> {
    return wisp.liftF(failure);
  }
}

export interface ProcessState<Relic> {
  readonly _processStateTodo?: Relic;
}

export interface FutureHandle<Result> {
  onSettled(listener: (result: FutureResult<Result>) => void): void;
  state(): FutureState<Result>;
}

export interface FutureState<Result> {
  readonly _futureStateTodo?: Result;
}

export interface Processor {
  readonly _processorTodo?: never;
}
