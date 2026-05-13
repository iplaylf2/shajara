import type { RiteCoroutine, RiteFuture } from "#/contracts";
import { currentExecutor } from "#/operations-kit";
import { fromFailure } from "#/boundary/index";
import { isLeft } from "@shajara/kernel/utils";

/**
 * Returns a JavaScript `Promise` for a shajara future.
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
