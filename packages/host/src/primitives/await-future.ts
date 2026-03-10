import type { RiteCoroutine, RiteFuture } from "#src/contracts";
import { encodeRitual, unwrapEither } from "#src/boundary";
import { awaitFuture as kernelAwaitFuture } from "@shajara/kernel";

export function* awaitFuture<Return>(future: RiteFuture<Return>): RiteCoroutine<Return> {
  const outcome = yield* encodeRitual(() => kernelAwaitFuture(future))();
  return unwrapEither(outcome);
}
