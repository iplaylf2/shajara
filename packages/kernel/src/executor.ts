import type { Blueprint } from "#src/contracts";
import { notImplemented } from "#src/internal/not-implemented";

const KERNEL_EXECUTION_SCOPE_REF_TOKEN: unique symbol = Symbol("kernel-execution-scope-ref");
const KERNEL_EXECUTION_POST_REF_TOKEN: unique symbol = Symbol("kernel-execution-post-ref");

export interface PostRef {
  readonly [KERNEL_EXECUTION_POST_REF_TOKEN]: "kernel-execution-post-ref";
}

export interface SpawnRef<ReturnValue = unknown> extends PostRef {
  readonly _return?: ReturnValue;
}

export interface ScopeRef extends PostRef {
  readonly [KERNEL_EXECUTION_SCOPE_REF_TOKEN]: "kernel-execution-scope-ref";
}

export interface SelfDescriptor {
  readonly scope: PostRef;
  readonly call: { readonly method: string; readonly args: readonly unknown[] } | undefined;
}

export type ExecutionResult<ReturnValue> =
  | { readonly kind: "ok"; readonly value: ReturnValue }
  | { readonly kind: "err"; readonly error: unknown };
export type ExecutionScopeState = "open" | "closing" | "closed";
export type ExecutionScopeCloseResult =
  | { readonly status: "completed" }
  | { readonly status: "failed"; readonly reason: unknown };

export interface ExecutionFuture<ReturnValue> {
  /**
   * Register a one-shot settlement callback.
   * Kernel must invoke listener exactly once, immediately if already settled.
   */
  onSettle(listener: (result: ExecutionResult<ReturnValue>) => void): void;
}

export interface ExecutionHandle<ReturnValue> {
  readonly future: ExecutionFuture<ReturnValue>;
  terminate(): void;
}

export interface ExecutionScopeHandle {
  readonly ref: ScopeRef;
  state(): ExecutionScopeState;
  /**
   * Register a one-shot close callback.
   * Kernel must invoke listener exactly once, immediately if already closed.
   */
  onClose(listener: (result: ExecutionScopeCloseResult) => void): void;
  terminate(): void;
}

export interface Executor {
  /**
   * Return the global root scope anchor.
   */
  rootScope(): ScopeRef;
  /**
   * Launch a blueprint under the given scope.
   */
  launch<ReturnValue>(
    scope: ScopeRef,
    blueprint: Blueprint<ReturnValue>,
  ): ExecutionHandle<ReturnValue>;
  /**
   * Post an input value into the target runtime ingress channel.
   */
  post<PostedValue>(scope: PostRef, value: PostedValue): void;
  /**
   * Create a host-managed scope rooted under the global root scope.
   */
  createScope(): ExecutionScopeHandle;
}

export function ensureExecutor(): Executor {
  return notImplemented("ensuring the kernel singleton executor");
}
