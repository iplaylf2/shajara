import { ensureExecutor, liftSyscall, receive as receiveSyscall } from "@khora/kernel";
import { scoped, self } from "#src/primitives";
import type { IngressScopeRef } from "@khora/kernel/scopes";
import type { RuntimePlan } from "#src/contracts";
import { ingressScopeSpec } from "@khora/kernel/scopes";
import { liftPlan } from "#src/adapter/plan-lift";

export function* sleep(milliseconds: number): RuntimePlan<void> {
  const executor = ensureExecutor();

  return yield* scoped(
    function* sleepBlueprint(): RuntimePlan<void> {
      const descriptor = yield* self<IngressScopeRef<unknown>>();
      const timeoutId = globalThis.setTimeout(() => {
        executor.post(descriptor.scopeRef, null);
      }, milliseconds);

      try {
        yield* liftPlan(liftSyscall(receiveSyscall<null>()));
      } finally {
        globalThis.clearTimeout(timeoutId);
      }
    },
    { spec: ingressScopeSpec() },
  );
}
