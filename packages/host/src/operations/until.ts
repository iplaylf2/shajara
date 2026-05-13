import { fromFailure, toFailureUnknown } from "#/boundary/index";
import type { RiteCoroutine } from "#/contracts";
import { completer } from "./completer";
import { wait } from "#/primitives/index";

/**
 * Invokes `thunk` and waits for its promise-like result inside the current coroutine.
 * Rejected promise-like results become errors thrown from the current coroutine.
 *
 * @returns Fulfillment value from the promise-like result.
 */
export function* until<Return>(thunk: PromiseThunk<Return>): RiteCoroutine<Return> {
  const { future, reject, resolve } = yield* completer<Return>();

  thunk().then(resolve, (error: unknown) => {
    reject(fromFailure(toFailureUnknown(error)));
  });

  return yield* wait(future);
}

/** Callback used by `until` to start promise-like work inside the current coroutine. */
export type PromiseThunk<Return> = () => PromiseLike<Return>;
