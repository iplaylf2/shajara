import type { RiteCoroutine, RiteFuture, RiteFutureResolver } from "#src/contracts";
import type { Either } from "@shajara/kernel/utils";
import type { Failure } from "@shajara/kernel";
import { encodeRitual } from "#src/boundary";
import { future as kernelFuture } from "@shajara/kernel";

export function future<Return>(): RiteCoroutine<[RiteFuture<Return>, RiteFutureResolver<Return>]> {
  return encodeRitual(() => kernelFuture<Either<Failure, Return>>())();
}
