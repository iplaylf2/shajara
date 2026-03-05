import type { Blueprint, Plan } from "./contracts/plan";
import type { Channel } from "./contracts/channel";
import type { Failure } from "./contracts/failure";
import type { ScopeRef } from "./contracts/scope";
import { notImplemented } from "./internal/not-implemented";

const ROOT_SCOPE_REF_TOKEN: unique symbol = Symbol("root-scope-ref");
const LAUNCH_REF_TOKEN: unique symbol = Symbol("launch-ref");

export interface ExecutionScopeRootRef extends ScopeRef<unknown> {
  readonly [ROOT_SCOPE_REF_TOKEN]: "root-scope-ref";
}

export interface ExecutionScopeRef extends ScopeRef<unknown> {
  readonly [LAUNCH_REF_TOKEN]: "launch-ref";
}

export type LaunchResult<Return> =
  | { readonly kind: "success"; readonly value: Return }
  | { readonly kind: "failure"; readonly reason: Failure }
  | { readonly kind: "terminated" };
export type LaunchState = "open" | "closing" | "closed";

export interface LaunchFuture<Return> {
  /**
   * Register a callback for the single settlement result.
   * Kernel invokes listener at most once.
   * If already settled, invocation is synchronous.
   */
  onResult(listener: (result: LaunchResult<Return>) => void): void;
}

export interface LaunchHandle<Return> {
  readonly ref: ExecutionScopeRef;
  readonly result: LaunchFuture<Return>;
  state(): LaunchState;
}

export interface Executor {
  /**
   * Global root scope anchor.
   */
  readonly rootScope: ExecutionScopeRootRef;
  /**
   * Launch a blueprint under the given scope.
   */
  launch<Return>(
    scope: ExecutionScopeRootRef | ExecutionScopeRef,
    blueprint: Blueprint<Return>,
  ): LaunchHandle<Return>;
  /**
   * Send a value into the target scope's channel message queue.
   */
  send<Value>(scope: ScopeRef<unknown>, channel: Channel<Value>, value: Value): void;
  /**
   * Terminate a host/runtime-controllable scope.
   */
  terminate(scope: ExecutionScopeRef): void;
  /**
   * Register cleanup continuation for a launched blueprint.
   */
  registerCleanup(blueprint: Blueprint<unknown>, cleanup: () => Plan<unknown>): void;
}

export function ensureExecutor(): Executor {
  return notImplemented("ensuring the kernel singleton executor");
}
