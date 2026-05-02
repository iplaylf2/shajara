import type { RiteCoroutine } from "#/contracts";
import { action } from "./action";
import { wait } from "#/primitives/index";

export function* sleep(milliseconds: number): RiteCoroutine<void> {
  const { future, resolve } = yield* action<null>();
  const timeoutId = globalThis.setTimeout(() => {
    resolve(null);
  }, milliseconds);

  try {
    yield* wait(future);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
