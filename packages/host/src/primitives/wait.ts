import type { RiteCoroutine, RiteFuture } from "#src/contracts";
import { encodeRitual, unwrapEither } from "#src/boundary";
import { wait as kernelWait } from "@shajara/kernel";

export function* wait<Result>(future: RiteFuture<Result>): RiteCoroutine<Result> {
  const outcome = yield* encodeRitual(() => kernelWait(future))();
  return unwrapEither(outcome);
}
