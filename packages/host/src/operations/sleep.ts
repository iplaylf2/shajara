import type { RiteCoroutine } from "#/contracts/index.js";
import { completer } from "./completer.js";
import { wait } from "#/primitives/index.js";

/**
 * Suspends the current routine until a JavaScript timer fires.
 * The timer is cleared if the wait is unwound before it fires.
 *
 * @param milliseconds - Delay passed to `setTimeout`.
 */
export function* sleep(milliseconds: number): RiteCoroutine<void> {
  const { future, resolve } = yield* completer<null>();
  const timeoutId = globalThis.setTimeout(() => {
    resolve(null);
  }, milliseconds);

  try {
    yield* wait(future);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
