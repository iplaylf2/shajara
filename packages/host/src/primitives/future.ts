import type { RiteCoroutine, RiteFuture, RiteFutureSettle } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { future as kernelFuture } from "@shajara/kernel";

export function future<Result>(): RiteCoroutine<[RiteFuture<Result>, RiteFutureSettle<Result>]> {
  return encodeRitual(() => kernelFuture<Result>())();
}
