import type { RiteCoroutine, RiteFuture, RiteFutureSettle } from "#/contracts";
import { future, settle } from "#/primitives/index";
import { park, spawnDetached } from "#/operations-kit";

/**
 * Starts provider work that publishes one ready value and stays owned by the current scope.
 * Provider `finally` blocks run when the owning scope releases the resource process.
 *
 * @returns Future settled by the provider's `provide` callback.
 */
export function* resource<Value>(body: ResourceBody<Value>): RiteCoroutine<RiteFuture<Value>> {
  const [providedValue, providedValueSettle] = yield* future<Value>();

  yield* spawnDetached(() => body(toResourceProvide(providedValueSettle)));

  return providedValue;
}

/** Provider routine started by `resource` inside the current scope. */
export type ResourceBody<Value> = (provide: ResourceProvide<Value>) => RiteCoroutine<void>;

/** Publishes the resource value, then parks the provider until scope cleanup unwinds it. */
export type ResourceProvide<Value> = (value: Value) => RiteCoroutine<never>;

function toResourceProvide<Value>(
  providedValueSettle: RiteFutureSettle<Value>,
): ResourceProvide<Value> {
  return function* provideResourceValue(value) {
    yield* settle(providedValueSettle, value);
    return yield* park();
  };
}
