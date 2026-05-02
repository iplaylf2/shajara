import type { BranchHandle, ScopedOutcome as OwnedOutcome } from "@shajara/kernel";
import type { Failure, RiteCoroutine, RiteFuture } from "#/contracts";
import { encodeRitual, unwrapEither } from "#/boundary/index";
import type { Either } from "@shajara/kernel/utils";
import { wait as kernelWait } from "@shajara/kernel";

export function* waitChild<Return>(child: BranchHandle<Return>): RiteCoroutine<Return> {
  return yield* waitFuture(child.scope.exitFuture);
}

export function* waitOutcome<Return>([scope, future]: OwnedOutcome<Return>): RiteCoroutine<Return> {
  yield* waitSettled(scope.exitFuture);
  return yield* waitFuture(future);
}

function* waitFuture<Return>(future: RiteFuture<Return>): RiteCoroutine<Return> {
  const settlement = yield* encodeRitual(() => kernelWait(future))();
  return unwrapEither(settlement as Either<Failure, Return>);
}

function* waitSettled<Return>(future: RiteFuture<Return>): RiteCoroutine<void> {
  yield* encodeRitual(() => kernelWait(future))();
}
