import type { Failure, RiteCoroutine, RiteFuture } from "#src/contracts";
import { encodeRitual, unwrapEither, unwrapOption } from "#src/boundary";
import type { Either } from "@shajara/kernel/utils";
import { poll as kernelPoll } from "@shajara/kernel";

export function* poll<Result>(future: RiteFuture<Result>): RiteCoroutine<Result | undefined> {
  const outcome = yield* encodeRitual(() => kernelPoll(future))();
  const settled = unwrapOption(outcome);

  if (settled) {
    return unwrapEither(settled as Either<Failure, Result>);
  }

  return settled;
}
