import { future, wait } from "#/primitives/index";
import { left, right } from "@shajara/kernel/utils";
import type { RiteCoroutine } from "#/contracts";
import { ensureExecutor } from "#/executor";
import { toFailureUnknown } from "#/boundary/index";

export function* until<Return>(thunk: PromiseThunk<Return>): RiteCoroutine<Return> {
  const executor = ensureExecutor();
  const [resultFuture, resultSettle] = yield* future<Return>();

  thunk().then(
    (value: Return) => executor.settle(resultSettle, right(value)),
    (error: unknown) => executor.settle(resultSettle, left(toFailureUnknown(error))),
  );

  return yield* wait(resultFuture);
}

export type PromiseThunk<Return> = () => PromiseLike<Return>;
