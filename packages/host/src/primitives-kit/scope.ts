import type { Failure, RiteCoroutine, RiteFuture } from "#/contracts";
import { encodeRitual, unwrapEither } from "#/boundary/index";
import type { BranchHandle } from "@shajara/kernel";
import type { Either } from "@shajara/kernel/utils";
import { wait as kernelWait } from "@shajara/kernel";

export function* waitChild<Return>(child: BranchHandle<Return>): RiteCoroutine<Return> {
  return yield* waitFuture(child.scope.exitFuture);
}

function* waitFuture<Return>(future: RiteFuture<Return>): RiteCoroutine<Return> {
  const settlement = yield* encodeRitual(() => kernelWait(future))();
  return unwrapEither(settlement as Either<Failure, Return>);
}
