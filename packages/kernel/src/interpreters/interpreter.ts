import type { FutureKey, FutureResult, ProcessRef, Ritual, ScopeRef, Wisp } from "#src/contracts";
import type { Failure } from "#src/failures";
import { scopeTerminated } from "#src/failures";
import { wisp } from "#src/internal/fp";

export abstract class Interpreter {
  public constructor(protected readonly entry: Ritual<void>) {}

  public abstract perform<Relic>(process: ProcessRef<Relic>): ProcessState<Relic>;

  public abstract spawn<Relic>(scope: ScopeRef<unknown>, worker: Ritual<Relic>): ProcessRef<Relic>;

  public abstract observe<Result>(future: FutureKey<Result>): FutureHandle<Result>;

  protected abstract onReady(process: ProcessRef<unknown>): Wisp<Processor>;

  // oxlint-disable-next-line class-methods-use-this
  protected onClose(_scope: ScopeRef<unknown>, _processes: ProcessRef<unknown>[]): Wisp<Failure> {
    return wisp.liftF(scopeTerminated());
  }

  // oxlint-disable-next-line class-methods-use-this
  protected onHalt(
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
