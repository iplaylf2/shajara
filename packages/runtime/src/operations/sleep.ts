import { ensureExecutor, liftSyscall, receive as receiveSyscall, signal } from "@khora/kernel";
import { scoped, self } from "#src/primitives";
import type { RuntimePlan } from "#src/contracts";
import { liftPlan } from "#src/adapter/plan-lift";

const wakeSignal = signal<null>();

export function* sleep(milliseconds: number): RuntimePlan<void> {
  const executor = ensureExecutor();

  return yield* scoped(function* sleepBlueprint(): RuntimePlan<void> {
    const { scopeRef } = yield* self();
    const timeoutId = globalThis.setTimeout(() => {
      executor.post(scopeRef, wakeSignal, null);
    }, milliseconds);

    try {
      yield* liftPlan(liftSyscall(receiveSyscall(wakeSignal)));
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  });
}
