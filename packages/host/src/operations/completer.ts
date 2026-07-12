import type { RiteCoroutine, RiteFuture } from "#/contracts/index.js";
import { left, right } from "@shajara/kernel/utils";
import { currentExecutor } from "#/operations-kit/index.js";
import { future } from "#/primitives/index.js";
import { toFailure } from "#/boundary/index.js";

/**
 * Creates a future owned by the current scope with settlement callbacks.
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
  resolve: (value: Return) => void;

  /**
   * Settles the future as rejected if it is still pending.
   *
   * @param reason - Error observed by callers waiting on the future.
   */
  reject: (reason: Error) => void;
}
