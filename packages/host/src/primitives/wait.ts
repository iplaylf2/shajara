import type { RiteCoroutine, RiteFuture } from "#src/contracts";
import { encodeRitual, unwrapEither } from "#src/boundary";
import { wait as kernelWait } from "@shajara/kernel";

export function* wait<Return>(future: RiteFuture<Return>): RiteCoroutine<Return> {
  const outcome = yield* encodeRitual(() => kernelWait(future))();
  return unwrapEither(outcome);
}
