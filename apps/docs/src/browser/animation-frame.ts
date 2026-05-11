import type { RiteCoroutine } from "@shajara/host";
import { completer } from "@shajara/host";
import { wait } from "@shajara/host/primitives";

export function* nextAnimationFrame(): RiteCoroutine<void> {
  const { future, resolve } = yield* completer<null>();
  const frame = globalThis.requestAnimationFrame(() => {
    resolve(null);
  });

  try {
    yield* wait(future);
  } finally {
    globalThis.cancelAnimationFrame(frame);
  }
}
