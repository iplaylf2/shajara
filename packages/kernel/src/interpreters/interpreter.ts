// oxlint-disable class-methods-use-this
import type {
  ContextKey,
  FutureKey,
  FutureResult,
  ProcessRef,
  Ritual,
  ScopeRef,
  Wisp,
} from "#src/contracts";
import type { Failure } from "#src/failures";
import type { Option } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented.js";
import { wisp } from "#src/internal/fp";

export abstract class Interpreter {
  public constructor(protected readonly entry: Ritual<void>) {}

  public step<Relic>(_process: ProcessRef<Relic>): ProcessStep<Relic> {
    return notImplemented("");
  }

  public spawn<Relic>(_scope: ScopeRef<unknown>, _worker: Ritual<Relic>): ProcessRef<Relic> {
    return notImplemented("");
  }

  public lookup<Value>(_scope: ScopeRef<unknown>, _contextKey: ContextKey<Value>): Option<Value> {
    return notImplemented("");
  }

  public poll<Result>(_future: FutureKey<Result>): Option<FutureResult<Result>> {
    return notImplemented("");
  }

  public wait<Result>(
    _future: FutureKey<Result>,
    _onSettled: (result: FutureResult<Result>) => void,
  ): void {
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

export interface ProcessStep<Relic> {
  readonly _processStepTodo?: Relic;
}

export interface Processor {
  readonly _processorTodo?: never;
}
