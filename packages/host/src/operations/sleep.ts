import { awaitFuture, future } from "#src/primitives";
import type { RiteCoroutine } from "#src/contracts";
import { ensureExecutor } from "@shajara/kernel";
import { right } from "@shajara/kernel/utils";

export function* sleep(milliseconds: number): RiteCoroutine<void> {
  const executor = ensureExecutor();
  const [wakeFuture, wakeResolverKey] = yield* future<null>();
  const timeoutId = globalThis.setTimeout(() => {
    executor.settle(wakeResolverKey, right(null));
  }, milliseconds);

  try {
    yield* awaitFuture(wakeFuture);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
