import type { Failure, RiteCoroutine, RiteFuture } from "#/contracts";
import { encodeRitual, unwrapEither, unwrapOption } from "#/boundary";
import type { Either } from "@shajara/kernel/utils";
import type { Optional } from "type-fest";
import { poll as kernelPoll } from "@shajara/kernel";

export function* poll<Result>(future: RiteFuture<Result>): RiteCoroutine<Optional<Result>> {
  const outcome = yield* encodeRitual(() => kernelPoll(future))();
  const settled = unwrapOption(outcome);

  if (settled) {
    return unwrapEither(settled as Either<Failure, Result>) as Optional<Result>;
  }

  return settled;
}
