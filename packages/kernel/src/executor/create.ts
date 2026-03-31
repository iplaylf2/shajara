import type { FutureResult, FutureSettleKey, Ritual, ScopeRef } from "#/contracts";
import type { Failure } from "#/failures";
import type { TaggedUnion } from "type-fest";
import { notImplemented } from "#/internal/not-implemented";

const EXECUTION_SCOPE_REF_TOKEN: unique symbol = Symbol("execution-scope-ref");

export interface ExecutionScopeRef extends ScopeRef<unknown> {
  readonly [EXECUTION_SCOPE_REF_TOKEN]: "execution-scope-ref";
}

export type LaunchResult<Return> = TaggedUnion<
  "kind",
  {
    canceled: {};
    failure: { readonly reason: Failure };
    success: { readonly value: Return };
  }
>;

export type LaunchState = "open" | "closing" | "closed";

export interface LaunchHandle<Return> {
  readonly scope: ExecutionScopeRef;
  onSettled(listener: (result: LaunchResult<Return>) => void): void;
  state(): LaunchState;
}

export interface Executor {
  readonly rootScope: ExecutionScopeRef;
  launch<Return>(scope: ExecutionScopeRef, ritual: Ritual<Return>): LaunchHandle<Return>;
  settle<Result>(futureSettle: FutureSettleKey<Result>, result: FutureResult<Result>): void;
  cancel(scope: ExecutionScopeRef): void;
}

export interface Disposable {
  dispose(): void;
}

export interface Scheduler {
  nextTick(work: () => void): Disposable;
  isExhausted(): boolean;
}

export function createExecutor(scheduler: Scheduler): Executor {
  return notImplemented(`creating an executor from scheduler ${String(scheduler)}`);
}
