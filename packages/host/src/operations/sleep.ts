import type { RiteCoroutine } from "#/contracts";
import { completer } from "./completer";
import { wait } from "#/primitives/index";

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
