import type { RiteCoroutine, RiteFuture } from "#/contracts";
import { currentExecutor } from "#/operations-kit";
import { fromFailure } from "#/boundary/index";
import { isLeft } from "@shajara/kernel/utils";

/**
 * Observes a shajara future as a JavaScript `Promise`.
 *
 * @param future - Future to observe.
 * @returns Promise that resolves with the future value or rejects with its error.
 */
export function* promisify<Return>(future: RiteFuture<Return>): RiteCoroutine<Promise<Return>> {
  const executor = yield* currentExecutor();

  return new Promise<Return>((resolve, reject) => {
    executor.onSettled(future, (result) => {
      if (isLeft(result)) {
        reject(fromFailure(result.left));
        return;
      }

      resolve(result.right);
    });
  });
}
