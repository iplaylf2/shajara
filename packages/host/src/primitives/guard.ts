import type { Failure, RiteCoroutine, RiteFuture, RiteRoutine } from "#/contracts";
import { decodeRitual, encodeRitual, toFailureUnknown } from "#/boundary/index";
import { left, right } from "@shajara/kernel/utils";
import type { Either } from "@shajara/kernel/utils";
import { ScopeError } from "#/errors";
import type { ScopeFailure } from "@shajara/kernel";
import { guard as kernelGuard } from "@shajara/kernel";

export type RecoveryHandler = (error: ScopeError) => RiteCoroutine<unknown>;

export function guard(
  entry: RiteRoutine<void>,
  recover: RecoveryHandler,
): RiteCoroutine<RiteFuture<void>> {
  return encodeRitual(() => kernelGuard(decodeRitual(entry), toKernelRecoveryHandler(recover)))();
}

function toKernelRecoveryHandler(recover: RecoveryHandler) {
  return (failure: ScopeFailure) =>
    decodeRitual(() => hostRecovery(recover, new ScopeError(failure)))();
}

function* hostRecovery(
  recover: RecoveryHandler,
  cause: ScopeError,
): RiteCoroutine<Either<Failure, unknown>> {
  try {
    const replacement = yield* recover(cause);
    return right(replacement);
  } catch (error) {
    return left(toFailureUnknown(error));
  }
}
