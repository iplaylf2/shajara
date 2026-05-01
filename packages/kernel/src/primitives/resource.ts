import type { FutureKey, FutureSettleKey, Wisp } from "#/contracts";
import { future } from "./future";
import { park } from "./park";
import { pipe } from "fp-ts/function";
import { right } from "#/utils/index";
import { settle } from "./settle";
import { spawn } from "./spawn";
import { wisp } from "#/internal/fp";

export function resource<Value>(body: ResourceBody<Value>): Wisp<FutureKey<Value>> {
  return pipe(
    future<Value>(),
    wisp.chainFirst(([, resourceSettle]) => spawn(resourceProvider(body, resourceSettle))),
    wisp.map(([resourceFuture]) => resourceFuture),
  );
}

export type ResourceBody<Value> = (provide: ResourceProvide<Value>) => Wisp<void>;
export type ResourceProvide<Value> = (value: Value) => Wisp<never>;

function resourceProvider<Value>(
  body: ResourceBody<Value>,
  resourceSettle: FutureSettleKey<Value>,
) {
  return () => body((value) => pipe(settle(resourceSettle, right(value)), wisp.chain(park)));
}
