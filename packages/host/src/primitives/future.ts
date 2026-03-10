import type { RiteCoroutine, RiteFuture, RiteFutureSettle } from "#src/contracts";
import type { Either } from "@shajara/kernel/utils";
import type { Failure } from "@shajara/kernel";
import { encodeRitual } from "#src/boundary";
import { future as kernelFuture } from "@shajara/kernel";

export function future<Result>(): RiteCoroutine<[RiteFuture<Result>, RiteFutureSettle<Result>]> {
  return encodeRitual(() => kernelFuture<Either<Failure, Result>>())();
}
