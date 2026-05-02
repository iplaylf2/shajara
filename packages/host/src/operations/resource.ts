import type { RiteCoroutine, RiteFuture, RiteFutureSettle } from "#/contracts";
import { decodeRitual, encodeRitual } from "#/boundary/index";
import { future, settle } from "#/primitives/index";
import { park, spawn } from "@shajara/kernel";

export function* resource<Value>(body: ResourceBody<Value>): RiteCoroutine<RiteFuture<Value>> {
  const [providedValue, providedValueSettle] = yield* future<Value>();

  yield* encodeRitual(() =>
    spawn(
      decodeRitual(() => body(toResourceProvide(providedValueSettle))),
      {
        completionMode: "detached",
      },
    ),
  )();

  return providedValue;
}

export type ResourceBody<Value> = (provide: ResourceProvide<Value>) => RiteCoroutine<void>;
export type ResourceProvide<Value> = (value: Value) => RiteCoroutine<never>;

function toResourceProvide<Value>(
  providedValueSettle: RiteFutureSettle<Value>,
): ResourceProvide<Value> {
  return function* provideResourceValue(value) {
    yield* settle(providedValueSettle, value);
    return yield* encodeRitual(() => park())();
  };
}
