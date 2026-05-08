import { fromFailure, toFailureUnknown } from "#/boundary/index";
import type { RiteCoroutine } from "#/contracts";
import { completer } from "./completer";
import { wait } from "#/primitives/index";

export function* until<Return>(thunk: PromiseThunk<Return>): RiteCoroutine<Return> {
  const { future, reject, resolve } = yield* completer<Return>();

  thunk().then(resolve, (error: unknown) => {
    reject(fromFailure(toFailureUnknown(error)));
  });

  return yield* wait(future);
}

export type PromiseThunk<Return> = () => PromiseLike<Return>;
