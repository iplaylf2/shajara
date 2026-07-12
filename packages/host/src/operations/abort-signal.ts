import type { RiteCoroutine } from "#/contracts/index.js";
import { currentExecutor } from "#/operations-kit/index.js";
import { fromFailure } from "#/boundary/index.js";
import { isLeft } from "@shajara/kernel/utils";
import { self } from "#/primitives/index.js";

/**
 * Creates an `AbortSignal` that aborts with the current scope.
 * If the scope is canceled or fails, the signal abort reason is the corresponding error.
 * The signal does not cancel the scope by itself.
 *
 * @returns Signal that aborts when the current scope starts converging.
 */
export function* abortSignal(): RiteCoroutine<AbortSignal> {
  const executor = yield* currentExecutor();
  const controller = new globalThis.AbortController();
  const { scope } = yield* self();

  executor.onSettled(scope.exitFuture, (result) => {
    if (isLeft(result)) {
      controller.abort(fromFailure(result.left));
      return;
    }

    controller.abort();
  });

  return controller.signal;
}
