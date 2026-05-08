import { CanceledError } from "#/errors";
import type { RiteCoroutine } from "#/contracts";
import { currentExecutor } from "#/operations-kit";
import { self } from "#/primitives/index";

export function* promiser<Return>(): RiteCoroutine<Promiser<Return>> {
  const executor = yield* currentExecutor();
  const {
    promise,
    reject: rejectPromise,
    resolve: resolvePromise,
  } = Promise.withResolvers<Return>();
  const { scope } = yield* self();

  const release = executor.onSettled(scope.exitFuture, () => {
    rejectPromise(new CanceledError());
  });

  function finish(settle: () => void): void {
    release();
    settle();
  }

  return {
    promise,
    reject(reason) {
      finish(() => {
        rejectPromise(reason);
      });
    },
    resolve(value) {
      finish(() => {
        resolvePromise(value);
      });
    },
  };
}

export type Promiser<Return> = PromiseWithResolvers<Return>;
