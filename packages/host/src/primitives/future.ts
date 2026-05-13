import type { RiteCoroutine, RiteFutureHandle } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { future as kernelFuture } from "@shajara/kernel";

/**
 * Allocates a future in the current scope.
 *
 * @returns Observation and settlement handles for the future.
 */
export function future<Result>(): RiteCoroutine<RiteFutureHandle<Result>> {
  return encodeRitual(() => kernelFuture<Result>())();
}
