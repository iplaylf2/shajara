import { join, receive, self, spawn } from "#src/primitives";
import type { RiteCoroutine } from "#src/contracts";
import { ensureExecutor } from "@shajara/kernel";
import { messageKey } from "#src/contracts";

export function* sleep(milliseconds: number): RiteCoroutine<void> {
  const executor = ensureExecutor();
  const scope = yield* spawn(
    function* sleepRitual(): RiteCoroutine<void> {
      const { scopeRef } = yield* self();
      const timeoutId = globalThis.setTimeout(() => {
        executor.send(scopeRef, wakeMessageKey, null);
      }, milliseconds);

      try {
        yield* receive(wakeMessageKey);
      } finally {
        globalThis.clearTimeout(timeoutId);
      }
    },
    { mode: "supervisor" },
  );

  return yield* join(scope);
}

const wakeMessageKey = messageKey<null>();
