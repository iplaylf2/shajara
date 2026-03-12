import type { Failure, RiteCoroutine, RiteFuture, RiteRoutine } from "#src/contracts";
import { decodeRitual, encodeRitual, fromFailure, toFailureUnknown } from "#src/boundary";
import { left, right } from "@shajara/kernel/utils";
import type { Either } from "@shajara/kernel/utils";
import { ShajaraError } from "#src/contracts";
import { guard as kernelGuard } from "@shajara/kernel";

export type RecoveryHandler = (error: ShajaraError) => RiteCoroutine<unknown>;

export function guard<Return>(
  entry: RiteRoutine<Return>,
  recover: RecoveryHandler,
): RiteCoroutine<RiteFuture<Return>> {
  return encodeRitual(() => kernelGuard(decodeRitual(entry), toKernelRecoveryHandler(recover)))();
}

function toKernelRecoveryHandler(recover: RecoveryHandler) {
  return (failure: Failure) => decodeRitual(() => hostRecovery(recover, fromFailure(failure)))();
}

function* hostRecovery(
  recover: RecoveryHandler,
  error: ShajaraError,
): RiteCoroutine<Either<Failure, unknown>> {
  try {
    const replacement = yield* recover(error);
    return right(replacement);
  } catch (caught) {
    return left(toFailureUnknown(caught));
  }
}
