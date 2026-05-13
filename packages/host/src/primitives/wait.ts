import type { Failure, RiteCoroutine, RiteFuture } from "#/contracts";
import { encodeRitual, unwrapEither } from "#/boundary/index";
import type { Either } from "@shajara/kernel/utils";
import { wait as kernelWait } from "@shajara/kernel";

/**
 * Waits for a future and returns its value.
 *
 * @param future - Future to observe.
 * @returns Settled future value.
 * @throws The error represented by the future's failure.
 */
export function* wait<Result>(future: RiteFuture<Result>): RiteCoroutine<Result> {
  const outcome = yield* encodeRitual(() => kernelWait(future))();
  return unwrapEither(outcome as Either<Failure, Result>);
}
