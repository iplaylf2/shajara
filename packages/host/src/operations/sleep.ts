import type { RiteCoroutine } from "#/contracts";
import { completer } from "./completer";
import { wait } from "#/primitives/index";

/**
 * Suspends the current coroutine with a JavaScript timer.
 *
 * @param milliseconds - Timer delay in milliseconds.
 * @returns Completion after the timer fires or the wait is unwound.
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
