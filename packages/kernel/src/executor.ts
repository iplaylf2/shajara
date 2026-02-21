import type { Blueprint } from "./plan";
import type { ScopeRef } from "./scope";
import { notImplemented } from "./internal/not-implemented";

const ROOT_SCOPE_REF_TOKEN: unique symbol = Symbol("root-scope-ref");
const EXECUTION_SCOPE_REF_TOKEN: unique symbol = Symbol("execution-scope-ref");

export interface RootScopeRef extends ScopeRef {
  readonly [ROOT_SCOPE_REF_TOKEN]: "root-scope-ref";
}

export interface ExecutionScopeRef extends ScopeRef {
  readonly [EXECUTION_SCOPE_REF_TOKEN]: "execution-scope-ref";
}

export type ExecutionResult<ReturnValue> =
  | { readonly kind: "success"; readonly value: ReturnValue }
  | { readonly kind: "failure"; readonly reason: unknown }
  | { readonly kind: "interruption" };
export type ExecutionScopeState = "open" | "closing" | "closed";

export interface ExecutionFuture<ReturnValue> {
  /**
   * Register a callback for the single settlement result.
   * Kernel invokes listener at most once.
   * If already settled, invocation is synchronous.
   */
  onResult(listener: (result: ExecutionResult<ReturnValue>) => void): void;
}

export interface ExecutionScope<ReturnValue = void> {
  readonly ref: ExecutionScopeRef;
  readonly result: ExecutionFuture<ReturnValue>;
  state(): ExecutionScopeState;
}

export interface Executor {
  /**
   * Global root scope anchor.
   */
  readonly rootScope: RootScopeRef;
  /**
   * Launch a blueprint under the given scope.
   */
  launch<ReturnValue>(
    scope: RootScopeRef | ExecutionScopeRef,
    blueprint: Blueprint<ReturnValue>,
  ): ExecutionScope<ReturnValue>;
  /**
   * Post an input value into the target runtime ingress channel.
   */
  post<PostedValue>(scope: ScopeRef, value: PostedValue): void;
  /**
   * Terminate a host/runtime-controllable execution scope.
   */
  terminate(scope: ExecutionScopeRef): void;
}

export function ensureExecutor(): Executor {
  return notImplemented("ensuring the kernel singleton executor");
}
