import type { Blueprint } from "#src/contracts";
import { notImplemented } from "#src/internal/not-implemented";

const KERNEL_EXECUTION_REF_TOKEN: unique symbol = Symbol("kernel-execution-ref");

export interface ExecutionRef<ReturnValue = unknown> {
  readonly [KERNEL_EXECUTION_REF_TOKEN]: "kernel-execution-ref";
  readonly _return?: ReturnValue;
}

export type ExecutionPending = { readonly kind: "pending" };
export type ExecutionResult<ReturnValue> =
  | { readonly kind: "ok"; readonly value: ReturnValue }
  | { readonly kind: "err"; readonly error: unknown };
export type ExecutionSettled<ReturnValue> = {
  readonly kind: "settled";
  readonly result: ExecutionResult<ReturnValue>;
};
export type ExecutionSnapshot<ReturnValue> = ExecutionPending | ExecutionSettled<ReturnValue>;

export type ExecutionFutureListener<ReturnValue> = (result: ExecutionResult<ReturnValue>) => void;

export interface ExecutionFuture<ReturnValue> {
  state(): ExecutionSnapshot<ReturnValue>;
  /**
   * Register a one-shot settlement callback.
   * Kernel must invoke listener exactly once, immediately if already settled.
   */
  onSettle(listener: ExecutionFutureListener<ReturnValue>): void;
}

export interface ExecutionHandle<ReturnValue> {
  readonly ref: ExecutionRef<ReturnValue>;
  readonly future: ExecutionFuture<ReturnValue>;
  terminate(): void;
}

export interface Executor {
  launch<ReturnValue>(blueprint: Blueprint<ReturnValue>): ExecutionHandle<ReturnValue>;
}

export function ensureExecutor(): Executor {
  return notImplemented("ensuring the kernel singleton executor");
}
