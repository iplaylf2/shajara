import { fromFailure, toFailureUnknown } from "#/boundary/index.js";
import type { RiteCoroutine } from "#/contracts/index.js";
import { completer } from "./completer.js";
import { wait } from "#/primitives/index.js";

/**
 * Invokes `thunk` and waits for its promise-like result inside the current routine.
 * A rejected promise-like result is thrown from the current routine.
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

/** Callback used by `until(...)` to start promise-like work. */
export type PromiseThunk<Return> = () => PromiseLike<Return>;
