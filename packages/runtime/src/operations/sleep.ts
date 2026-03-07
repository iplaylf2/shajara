import { receive, scoped, self } from "#src/primitives";
import type { RiteCoroutine } from "#src/contracts";
import { channel } from "#src/contracts";
import { ensureExecutor } from "@shajara/kernel";

export function* sleep(milliseconds: number): RiteCoroutine<void> {
  const executor = ensureExecutor();

  return yield* scoped(function* sleepBlueprint(): RiteCoroutine<void> {
    const { scopeRef } = yield* self();
    const timeoutId = globalThis.setTimeout(() => {
      executor.send(scopeRef, wakeChannel, null);
    }, milliseconds);

    try {
      yield* receive(wakeChannel);
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  });
}

const wakeChannel = channel<null>();
