import type { RiteCoroutine, RiteFuture, RiteFutureSettle } from "#src/contracts";
import { encodeRitual } from "#src/boundary";
import { future as kernelFuture } from "@shajara/kernel";

export function future<Result>(): RiteCoroutine<[RiteFuture<Result>, RiteFutureSettle<Result>]> {
  return encodeRitual(() => kernelFuture<Result>())();
}
