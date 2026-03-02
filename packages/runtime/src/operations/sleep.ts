import { channel, ensureExecutor } from "@khora/kernel";
import { receive, scoped, self } from "#src/primitives";
import type { RuntimePlan } from "#src/contracts";

export function* sleep(milliseconds: number): RuntimePlan<void> {
  const executor = ensureExecutor();

  return yield* scoped(function* sleepBlueprint(): RuntimePlan<void> {
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
