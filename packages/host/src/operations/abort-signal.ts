import type { RiteCoroutine } from "#/contracts";
import { currentExecutor } from "#/operations-kit";
import { self } from "#/primitives/index";

/**
 * Creates an `AbortSignal` that observes current-scope convergence.
 * The signal does not provide cancellation authority for the scope.
 *
 * @returns Signal that aborts when the current scope starts converging.
 */
export function* abortSignal(): RiteCoroutine<AbortSignal> {
  const executor = yield* currentExecutor();
  const controller = new globalThis.AbortController();
  const { scope } = yield* self();

  executor.onSettled(scope.exitFuture, () => {
    controller.abort();
  });

  return controller.signal;
}
