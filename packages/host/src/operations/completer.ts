import type { RiteCoroutine, RiteFuture } from "#/contracts";
import { left, right } from "@shajara/kernel/utils";
import { currentExecutor } from "#/operations-kit";
import { future } from "#/primitives/index";
import { toFailure } from "#/boundary/index";

/**
 * Creates a future with settlement callbacks.
 * If still pending, the future is canceled when the current scope converges.
 *
 * @returns Future plus `resolve` and `reject` callbacks.
 */
export function* completer<Return>(): RiteCoroutine<Completer<Return>> {
  const executor = yield* currentExecutor();
  const [result, settleResult] = yield* future<Return>();

  return {
    future: result,
    reject(reason) {
      executor.settle(settleResult, left(toFailure(reason)));
    },
    resolve(value) {
      executor.settle(settleResult, right(value));
    },
  };
}

/** Completion controls for settling one future from callbacks. */
export interface Completer<Return> {
  /** Future carrying the completion result. */
  readonly future: RiteFuture<Return>;

  /**
   * Settles the future with a value if it is still pending.
   *
   * @param value - Completion value.
   */
  resolve(value: Return): void;

  /**
   * Settles the future as rejected if it is still pending.
   *
   * @param reason - Error observed by callers waiting on the future.
   */
  reject(reason: Error): void;
}
