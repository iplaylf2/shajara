import type { RiteCoroutine, RiteFuture, RiteFutureSettle } from "#/contracts/index.js";
import { future, settle } from "#/primitives/index.js";
import { park, spawnDetached } from "#/operations-kit/index.js";

/**
 * Starts provider work that publishes one ready value in the current scope.
 * The provider stays attached until the owning scope releases it.
 *
 * @returns Future settled by the provider's `provide` call.
 */
export function* resource<Value>(body: ResourceBody<Value>): RiteCoroutine<RiteFuture<Value>> {
  const [providedValue, providedValueSettle] = yield* future<Value>();

  yield* spawnDetached(() => body(toResourceProvide(providedValueSettle)));

  return providedValue;
}

/** Provider routine run by `resource(...)` inside the current scope. */
export type ResourceBody<Value> = (provide: ResourceProvide<Value>) => RiteCoroutine<void>;

/** Publishes the resource value, then waits until the owning scope releases the provider. */
export type ResourceProvide<Value> = (value: Value) => RiteCoroutine<never>;

function toResourceProvide<Value>(
  providedValueSettle: RiteFutureSettle<Value>,
): ResourceProvide<Value> {
  return function* provideResourceValue(value) {
    yield* settle(providedValueSettle, value);
    return yield* park();
  };
}
