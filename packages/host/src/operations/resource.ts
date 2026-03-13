import type { RiteCoroutine, RiteFuture } from "#src/contracts";
import { future, park, settle, spawn } from "#src/primitives";

export function* resource<Value>(body: ResourceBody<Value>): RiteCoroutine<RiteFuture<Value>> {
  const [resourceFuture, resourceSettle] = yield* future<Value>();

  function* provide(value: Value): RiteCoroutine<never> {
    yield* settle(resourceSettle, value);
    return yield* park();
  }

  yield* spawn(() => body(provide));

  return resourceFuture;
}

export type ResourceBody<Value> = (provide: ResourceProvide<Value>) => RiteCoroutine<void>;
export type ResourceProvide<Value> = (value: Value) => RiteCoroutine<never>;
