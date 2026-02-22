import type { Blueprint } from "./contracts/plan";
import type { ScopeRef } from "./contracts/scope";
import { notImplemented } from "./internal/not-implemented";

const ROOT_SCOPE_REF_TOKEN: unique symbol = Symbol("root-scope-ref");
const LAUNCH_REF_TOKEN: unique symbol = Symbol("launch-ref");

export interface ExecutionScopeRoot extends ScopeRef {
  readonly [ROOT_SCOPE_REF_TOKEN]: "root-scope-ref";
}

export interface ExecutionScope extends ScopeRef {
  readonly [LAUNCH_REF_TOKEN]: "launch-ref";
}

export type LaunchResult<ReturnValue> =
  | { readonly kind: "success"; readonly value: ReturnValue }
  | { readonly kind: "failure"; readonly reason: unknown }
  | { readonly kind: "interruption" };
export type LaunchState = "open" | "closing" | "closed";

export interface LaunchFuture<ReturnValue> {
  /**
   * Register a callback for the single settlement result.
   * Kernel invokes listener at most once.
   * If already settled, invocation is synchronous.
   */
  onResult(listener: (result: LaunchResult<ReturnValue>) => void): void;
}

export interface LaunchHandle<ReturnValue = void> {
  readonly ref: ExecutionScope;
  readonly result: LaunchFuture<ReturnValue>;
  state(): LaunchState;
}

export interface Executor {
  /**
   * Global root scope anchor.
   */
  readonly rootScope: ExecutionScopeRoot;
  /**
   * Launch a blueprint under the given scope.
   */
  launch<ReturnValue>(
    scope: ExecutionScopeRoot | ExecutionScope,
    blueprint: Blueprint<ReturnValue>,
  ): LaunchHandle<ReturnValue>;
  /**
   * Post an input value into the target runtime ingress channel.
   */
  post<PostedValue>(scope: ScopeRef, value: PostedValue): void;
  /**
   * Terminate a host/runtime-controllable scope.
   */
  terminate(scope: ExecutionScope): void;
}

export function ensureExecutor(): Executor {
  return notImplemented("ensuring the kernel singleton executor");
}
