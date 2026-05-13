import type { RiteCoroutine, RiteFuture, RiteFutureSettle } from "#/contracts";
import { future, settle } from "#/primitives/index";
import { park, spawnDetached } from "#/operations-kit";

/**
 * Starts provider work that publishes a value and stays owned by the current scope.
 *
 * @param body - Routine that receives the publish callback.
 * @returns Future that settles with the provided value.
 */
export function* resource<Value>(body: ResourceBody<Value>): RiteCoroutine<RiteFuture<Value>> {
  const [providedValue, providedValueSettle] = yield* future<Value>();

  yield* spawnDetached(() => body(toResourceProvide(providedValueSettle)));

  return providedValue;
}

/** Resource provider routine that receives a publish callback. */
export type ResourceBody<Value> = (provide: ResourceProvide<Value>) => RiteCoroutine<void>;

/** Publishes a resource value, then parks the provider until scope cleanup unwinds it. */
export type ResourceProvide<Value> = (value: Value) => RiteCoroutine<never>;

function toResourceProvide<Value>(
  providedValueSettle: RiteFutureSettle<Value>,
): ResourceProvide<Value> {
  return function* provideResourceValue(value) {
    yield* settle(providedValueSettle, value);
    return yield* park();
  };
}
