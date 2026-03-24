import type { Failure, RiteCoroutine, RiteFuture, RiteRoutine } from "#/contracts";
import { decodeRitual, encodeRitual, fromFailure, toFailureUnknown } from "#/boundary";
import { left, right } from "@shajara/kernel/utils";
import type { Either } from "@shajara/kernel/utils";
import type { FailureShape } from "@shajara/kernel";
import { guard as kernelGuard } from "@shajara/kernel";

export type RecoveryHandler = (error: Error) => RiteCoroutine<unknown>;

export function guard(
  entry: RiteRoutine<void>,
  recover: RecoveryHandler,
): RiteCoroutine<RiteFuture<void>> {
  return encodeRitual(() => kernelGuard(decodeRitual(entry), toKernelRecoveryHandler(recover)))();
}

function toKernelRecoveryHandler(recover: RecoveryHandler) {
  return (failure: FailureShape) =>
    decodeRitual(() => hostRecovery(recover, fromFailure(failure as Failure)))();
}

function* hostRecovery(
  recover: RecoveryHandler,
  error: Error,
): RiteCoroutine<Either<Failure, unknown>> {
  try {
    const replacement = yield* recover(error);
    return right(replacement);
  } catch (caught) {
    return left(toFailureUnknown(caught));
  }
}
