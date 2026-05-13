import { fromFailure, toFailureUnknown } from "#/boundary/index";
import type { RiteCoroutine } from "#/contracts";
import { completer } from "./completer";
import { wait } from "#/primitives/index";

/**
 * Waits for a promise-like value inside the current coroutine.
 *
 * @param thunk - Promise-producing callback.
 * @returns Fulfilled promise value.
 * @throws The error represented by a rejected promise.
 */
export function* until<Return>(thunk: PromiseThunk<Return>): RiteCoroutine<Return> {
  const { future, reject, resolve } = yield* completer<Return>();

  thunk().then(resolve, (error: unknown) => {
    reject(fromFailure(toFailureUnknown(error)));
  });

  return yield* wait(future);
}

/** Callback that starts promise-like work when invoked. */
export type PromiseThunk<Return> = () => PromiseLike<Return>;
