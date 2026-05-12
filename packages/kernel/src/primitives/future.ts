import type { FutureHandle, Wisp } from "#/contracts";
import { future as futureSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Allocates a current-scope future.
 *
 * @returns Observation and settlement handles.
 */
export function future<Result>(): Wisp<FutureHandle<Result>> {
  return wisp.liftF(futureSigil<Result>());
}
