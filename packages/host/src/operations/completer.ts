import type { RiteCoroutine, RiteFuture } from "#/contracts";
import { left, right } from "@shajara/kernel/utils";
import { currentExecutor } from "#/operations-kit";
import { future } from "#/primitives/index";
import { toFailure } from "#/boundary/index";

/**
 * Creates a future with JavaScript callbacks for settling it.
 *
 * @returns Future and completion callbacks.
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

/** Completion controls for a future. */
export interface Completer<Return> {
  /** Future carrying the completion result. */
  readonly future: RiteFuture<Return>;

  /**
   * Settles the future with a value.
   *
   * @param value - Completion value.
   */
  resolve(value: Return): void;

  /**
   * Settles the future with a failure.
   *
   * @param reason - Error to store as the failure.
   */
  reject(reason: Error): void;
}
