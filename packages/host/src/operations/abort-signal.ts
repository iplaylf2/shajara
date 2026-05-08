import type { RiteCoroutine } from "#/contracts";
import { ensureExecutor } from "#/executor";
import { self } from "#/primitives/index";

export function* abortSignal(): RiteCoroutine<AbortSignal> {
  const executor = ensureExecutor();
  const controller = new globalThis.AbortController();
  const { scope } = yield* self();

  executor.onSettled(scope.exitFuture, () => {
    controller.abort();
  });

  return controller.signal;
}
