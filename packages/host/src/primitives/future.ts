import type { RiteCoroutine, RiteFutureHandle } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { future as kernelFuture } from "@shajara/kernel";

export function future<Result>(): RiteCoroutine<RiteFutureHandle<Result>> {
  return encodeRitual(() => kernelFuture<Result>())();
}
