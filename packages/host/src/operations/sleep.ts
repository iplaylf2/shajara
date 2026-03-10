import { future, wait } from "#src/primitives";
import type { RiteCoroutine } from "#src/contracts";
import { ensureExecutor } from "@shajara/kernel";
import { right } from "@shajara/kernel/utils";

export function* sleep(milliseconds: number): RiteCoroutine<void> {
  const executor = ensureExecutor();
  const [wakeFuture, wakeSettle] = yield* future<null>();
  const timeoutId = globalThis.setTimeout(() => {
    executor.settle(wakeSettle, right(null));
  }, milliseconds);

  try {
    yield* wait(wakeFuture);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
