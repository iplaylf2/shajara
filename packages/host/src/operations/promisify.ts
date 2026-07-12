import type { RiteCoroutine, RiteFuture } from "#/contracts/index.js";
import { currentExecutor } from "#/operations-kit/index.js";
import { fromFailure } from "#/boundary/index.js";
import { isLeft } from "@shajara/kernel/utils";

/**
 * Exposes a shajara future as a JavaScript `Promise`.
 *
 * @returns Promise that resolves with the future value or rejects with the future's error.
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
