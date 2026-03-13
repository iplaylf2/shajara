import type { FutureResult, FutureSettleKey } from "./contracts/future-key";
import type { Ritual, Wisp } from "./contracts/wisp";
import type { Failure } from "./failures";
import type { ScopeRef } from "./contracts/scope";
import { notImplemented } from "./internal/not-implemented";

const EXECUTION_SCOPE_REF_TOKEN: unique symbol = Symbol("execution-scope-ref");

export interface ExecutionScopeRef extends ScopeRef<unknown> {
  readonly [EXECUTION_SCOPE_REF_TOKEN]: "execution-scope-ref";
}

export type LaunchResult<Return> =
  | { readonly kind: "success"; readonly value: Return }
  | { readonly kind: "failure"; readonly reason: Failure }
  | { readonly kind: "terminated" };
export type LaunchState = "open" | "closing" | "closed";

export interface LaunchHandle<Return> {
  readonly ref: ExecutionScopeRef;
  /**
   * Register a callback for the single settlement result.
   * Kernel invokes listener at most once.
   * If already settled, invocation is synchronous.
   */
  onSettled(listener: (result: LaunchResult<Return>) => void): void;
  state(): LaunchState;
}

export interface Executor {
  /**
   * Global root scope anchor.
   */
  readonly rootScope: ExecutionScopeRef;
  /**
   * Launch a ritual under the given scope.
   */
  launch<Return>(scope: ExecutionScopeRef, ritual: Ritual<Return>): LaunchHandle<Return>;
  /**
   * Settle a future result slot through its settlement capability.
   */
  settle<Result>(futureSettle: FutureSettleKey<Result>, result: FutureResult<Result>): void;
  /**
   * Terminate an execution scope, including root.
   */
  terminate(scope: ExecutionScopeRef): void;
  /**
   * Register cleanup continuation for a launched ritual.
   */
  registerCleanup(ritual: Ritual<unknown>, cleanup: () => Wisp<unknown>): void;
}

export function ensureExecutor(): Executor {
  return notImplemented("ensuring the kernel singleton executor");
}
