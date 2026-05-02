import { fromFailure, toFailureUnknown } from "#/boundary/index";
import type { RiteCoroutine } from "#/contracts";
import { action } from "./action";
import { wait } from "#/primitives/index";

export function* until<Return>(thunk: PromiseThunk<Return>): RiteCoroutine<Return> {
  const { future, reject, resolve } = yield* action<Return>();

  thunk().then(resolve, (error: unknown) => {
    reject(fromFailure(toFailureUnknown(error)));
  });

  return yield* wait(future);
}

export type PromiseThunk<Return> = () => PromiseLike<Return>;
