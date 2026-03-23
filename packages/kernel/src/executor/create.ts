import type { FutureResult, FutureSettleKey, Ritual, ScopeRef } from "#src/contracts";
import type { Failure } from "#src/failures";
import type { Interpreter } from "#src/interpreter";
import { notImplemented } from "#src/internal/not-implemented";

const EXECUTION_SCOPE_REF_TOKEN: unique symbol = Symbol("execution-scope-ref");

export interface ExecutionScopeRef extends ScopeRef<unknown> {
  readonly [EXECUTION_SCOPE_REF_TOKEN]: "execution-scope-ref";
}

export type LaunchResult<Return> =
  | { readonly kind: "success"; readonly value: Return }
  | { readonly kind: "failure"; readonly reason: Failure }
  | { readonly kind: "canceled" };

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

export function createExecutor(interpreter: Interpreter): Executor {
  return notImplemented(`creating an executor from interpreter ${interpreter.constructor.name}`);
}
