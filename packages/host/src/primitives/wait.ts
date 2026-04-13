import type { Failure, RiteCoroutine, RiteFuture } from "#/contracts";
import { encodeRitual, unwrapEither } from "#/boundary";
import type { Either } from "@shajara/kernel/utils";
import { wait as kernelWait } from "@shajara/kernel";

export function* wait<Result>(future: RiteFuture<Result>): RiteCoroutine<Result> {
  const outcome = yield* encodeRitual(() => kernelWait(future))();
  return unwrapEither(outcome as Either<Failure, Result>);
}
