import type { FutureHandle, Wisp } from "#/contracts/index.js";
import { future as futureSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/**
 * Allocates a future owned by the current scope.
 *
 * @returns Observation and settlement authorities.
 */
export function future<Result>(): Wisp<FutureHandle<Result>> {
  return wisp.liftF(futureSigil<Result>());
}
