import type { RiteCoroutine, RiteFuture } from "#src/contracts";
import { encodeRitual, unwrapEither, unwrapOption } from "#src/boundary";
import { poll as kernelPoll } from "@shajara/kernel";

export function* poll<Result>(future: RiteFuture<Result>): RiteCoroutine<Result | undefined> {
  const outcome = yield* encodeRitual(() => kernelPoll(future))();
  const settled = unwrapOption(outcome);

  return settled && unwrapEither(settled);
}
