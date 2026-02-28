import { channel, ensureExecutor, liftSyscall, receive as receiveSyscall } from "@khora/kernel";
import { scoped, self } from "#src/primitives";
import type { RuntimePlan } from "#src/contracts";
import { liftPlan } from "#src/adapter/plan-lift";

export function* sleep(milliseconds: number): RuntimePlan<void> {
  const executor = ensureExecutor();

  return yield* scoped(function* sleepBlueprint(): RuntimePlan<void> {
    const { scopeRef } = yield* self();
    const timeoutId = globalThis.setTimeout(() => {
      executor.send(scopeRef, wakeChannel, null);
    }, milliseconds);

    try {
      yield* liftPlan(liftSyscall(receiveSyscall(wakeChannel)));
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  });
}

const wakeChannel = channel<null>();
