import { future, wait } from "#/primitives/index";
import type { RiteCoroutine } from "#/contracts";
import { ensureExecutor } from "#/executor";
import { right } from "@shajara/kernel/utils";

export function* sleep(milliseconds: number): RiteCoroutine<void> {
  const executor = ensureExecutor();
  const [wakeSignal, wakeSettle] = yield* future<null>();
  const timeoutId = globalThis.setTimeout(() => {
    executor.settle(wakeSettle, right(null));
  }, milliseconds);

  try {
    yield* wait(wakeSignal);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
