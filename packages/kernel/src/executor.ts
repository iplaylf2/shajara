import type { Blueprint } from "#src/contracts";
import { notImplemented } from "#src/internal/not-implemented";

const KERNEL_EXECUTION_SCOPE_REF_TOKEN: unique symbol = Symbol("kernel-execution-scope-ref");
const KERNEL_EXECUTION_ROOT_SCOPE_REF_TOKEN: unique symbol = Symbol(
  "kernel-execution-root-scope-ref",
);
const KERNEL_EXECUTION_MANAGED_SCOPE_REF_TOKEN: unique symbol = Symbol(
  "kernel-execution-managed-scope-ref",
);

export interface ScopeRef {
  readonly [KERNEL_EXECUTION_SCOPE_REF_TOKEN]: "kernel-execution-scope-ref";
}

export interface RootScopeRef extends ScopeRef {
  readonly [KERNEL_EXECUTION_ROOT_SCOPE_REF_TOKEN]: "kernel-execution-root-scope-ref";
}

/**
 * Host/runtime-controllable execution scope reference.
 * This is narrower than ScopeRef and is the only accepted target for external termination.
 */
export interface ExecutionScopeRef extends ScopeRef {
  readonly [KERNEL_EXECUTION_MANAGED_SCOPE_REF_TOKEN]: "kernel-execution-managed-scope-ref";
}

export interface SpawnRef<ReturnValue = unknown> extends ScopeRef {
  readonly _return?: ReturnValue;
}

export interface SelfDescriptor {
  readonly scope: ScopeRef;
  readonly call: { readonly method: string; readonly args: readonly unknown[] } | undefined;
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
  post<PostedValue>(scope: ExecutionScopeRef, value: PostedValue): void;
  /**
   * Terminate a host/runtime-controllable execution scope.
   */
  terminate(scope: ExecutionScopeRef): void;
  /**
   * Create a host-managed scope rooted under the global root scope.
   */
  createScope(): ExecutionScope<never>;
}

export function ensureExecutor(): Executor {
  return notImplemented("ensuring the kernel singleton executor");
}
