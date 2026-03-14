import type { FutureKey, FutureResult, ProcessRef, Ritual, ScopeRef } from "./contracts";

export abstract class Interpreter {
  public constructor(protected readonly entry: Ritual<void>) {}

  public abstract perform<Relic>(process: ProcessRef<Relic>): ProcessState<Relic>;

  public abstract spawn<Relic>(scope: ScopeRef<unknown>, worker: Ritual<Relic>): ProcessRef<Relic>;

  public abstract observe<Result>(future: FutureKey<Result>): FutureHandle<Result>;

  protected abstract onReady(processWrap: ProcessWrap<unknown>): void;
}

export interface FutureHandle<Result> {
  onSettled(listener: (result: FutureResult<Result>) => void): void;
  state(): FutureState<Result>;
}

export interface FutureState<Result> {
  readonly _futureStateTodo?: Result;
}

export interface ProcessWrap<Relic> {
  readonly _processWrapTodo?: Relic;
}

export interface ProcessState<Relic> {
  readonly _processStateTodo?: Relic;
}

export interface Processor {
  readonly _processorTodo?: never;
}
