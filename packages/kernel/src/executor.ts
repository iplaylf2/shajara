import type { Blueprint } from "#src/plan-contract";
import { notImplemented } from "#src/internal/not-implemented";

const KERNEL_EXECUTION_REF_TOKEN: unique symbol = Symbol("kernel-execution-ref");

export interface KernelExecutionRef<ReturnValue = unknown> {
  readonly [KERNEL_EXECUTION_REF_TOKEN]: "kernel-execution-ref";
  readonly _return?: ReturnValue;
}

export type KernelExecutionPending = { readonly kind: "pending" };
export type KernelExecutionResult<ReturnValue> =
  | { readonly kind: "ok"; readonly value: ReturnValue }
  | { readonly kind: "err"; readonly error: unknown };
export type KernelExecutionSettled<ReturnValue> = {
  readonly kind: "settled";
  readonly result: KernelExecutionResult<ReturnValue>;
};
export type KernelExecutionSnapshot<ReturnValue> =
  | KernelExecutionPending
  | KernelExecutionSettled<ReturnValue>;

export type KernelExecutionFutureListener<ReturnValue> = (
  result: KernelExecutionResult<ReturnValue>,
) => void;

export interface KernelExecutionFuture<ReturnValue> {
  state(): KernelExecutionSnapshot<ReturnValue>;
  /**
   * Register a one-shot settlement callback.
   * Kernel must invoke listener exactly once, immediately if already settled.
   */
  onSettle(listener: KernelExecutionFutureListener<ReturnValue>): void;
}

export interface KernelExecutionHandle<ReturnValue> {
  readonly ref: KernelExecutionRef<ReturnValue>;
  readonly future: KernelExecutionFuture<ReturnValue>;
  terminate(): void;
}

export interface KernelExecutor {
  launch<ReturnValue>(blueprint: Blueprint<ReturnValue>): KernelExecutionHandle<ReturnValue>;
}

export function ensureExecutor(): KernelExecutor {
  return notImplemented("ensuring the kernel singleton executor");
}
