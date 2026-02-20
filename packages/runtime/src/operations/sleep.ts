import type { RuntimePlan } from "#src/contracts";
import { liftPlan } from "#src/adapter/plan-lift";
import { ensureExecutor } from "@khora/kernel";
import { receive as kernelReceive } from "@khora/kernel/primitives";
import { scoped } from "#src/primitives/scoped";
import { self } from "#src/primitives/self";

export function* sleep(milliseconds: number): RuntimePlan<void> {
  const executor = ensureExecutor();

  return yield* scoped(function* sleepBlueprint(): RuntimePlan<void> {
    const descriptor = yield* self();
    const timeoutId = globalThis.setTimeout(() => {
      executor.post(descriptor.scope, null);
    }, milliseconds);

    try {
      yield* liftPlan(kernelReceive<null>());
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  });
}
