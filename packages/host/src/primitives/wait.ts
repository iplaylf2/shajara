import type { Failure, RiteCoroutine, RiteFuture } from "#/contracts";
import { encodeRitual, unwrapEither } from "#/boundary/index";
import type { Either } from "@shajara/kernel/utils";
import { wait as kernelWait } from "@shajara/kernel";

/**
 * Waits for a future to settle successfully.
 *
 * @returns Future value.
 * @throws Error represented by the future failure.
 */
export function* wait<Result>(future: RiteFuture<Result>): RiteCoroutine<Result> {
  const outcome = yield* encodeRitual(() => kernelWait(future))();
  return unwrapEither(outcome as Either<Failure, Result>);
}
