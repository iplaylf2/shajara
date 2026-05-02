import type { RiteCoroutine, RiteFuture, RiteFutureSettle } from "#/contracts";
import { future, settle } from "#/primitives/index";
import { park, spawnDetached } from "#/operations-kit";

export function* resource<Value>(body: ResourceBody<Value>): RiteCoroutine<RiteFuture<Value>> {
  const [providedValue, providedValueSettle] = yield* future<Value>();

  yield* spawnDetached(() => body(toResourceProvide(providedValueSettle)));

  return providedValue;
}

export type ResourceBody<Value> = (provide: ResourceProvide<Value>) => RiteCoroutine<void>;
export type ResourceProvide<Value> = (value: Value) => RiteCoroutine<never>;

function toResourceProvide<Value>(
  providedValueSettle: RiteFutureSettle<Value>,
): ResourceProvide<Value> {
  return function* provideResourceValue(value) {
    yield* settle(providedValueSettle, value);
    return yield* park();
  };
}
