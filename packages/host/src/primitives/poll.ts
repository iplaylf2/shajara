import type { Failure, Presence, RiteCoroutine, RiteFuture } from "#/contracts/index.js";
import { encodeRitual, unwrapEither, unwrapOption } from "#/boundary/index.js";
import type { Either } from "@shajara/kernel/utils";
import { poll as kernelPoll } from "@shajara/kernel";

/**
 * Observes a future's current settlement state without blocking.
 *
 * @returns `[true, value]` when settled with a value, or `[false]` while pending.
 * @throws Error represented by the future failure.
 */
export function* poll<Result>(future: RiteFuture<Result>): RiteCoroutine<Presence<Result>> {
  const outcome = yield* encodeRitual(() => kernelPoll(future))();
  const result = unwrapOption(outcome);
  const [isSettled, settled] = result;

  if (!isSettled) {
    return result;
  }

  return [true, unwrapEither(settled as Either<Failure, Result>)];
}
