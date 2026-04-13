import type { FutureKey, FutureSettleKey, Wisp } from "#/contracts";
import { future, settle, spawn } from "#/sigils";
import { park } from "./park";
import { pipe } from "fp-ts/function";
import { right } from "#/utils";
import { wisp } from "#/internal/fp";

export function resource<Value>(body: ResourceBody<Value>): Wisp<FutureKey<Value>> {
  return pipe(
    future<Value>(),
    wisp.liftF,
    wisp.chainFirstF(([, resourceSettle]) => spawn(resourceWorker(body, resourceSettle))),
    wisp.map(([resourceFuture]) => resourceFuture),
  );
}

export type ResourceBody<Value> = (provide: ResourceProvide<Value>) => Wisp<void>;
export type ResourceProvide<Value> = (value: Value) => Wisp<never>;

function resourceWorker<Value>(body: ResourceBody<Value>, resourceSettle: FutureSettleKey<Value>) {
  return () =>
    body((value) => pipe(settle(resourceSettle, right(value)), wisp.liftF, wisp.chain(park)));
}
