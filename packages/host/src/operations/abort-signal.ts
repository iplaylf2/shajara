import type { RiteCoroutine } from "#/contracts";
import { resource } from "./resource";
import { wait } from "#/primitives/index";

export function* abortSignal(): RiteCoroutine<AbortSignal> {
  const signal = yield* resource<AbortSignal>(function* provideAbortSignal(provide) {
    const controller = new globalThis.AbortController();

    try {
      yield* provide(controller.signal);
    } finally {
      controller.abort();
    }
  });

  return yield* wait(signal);
}
