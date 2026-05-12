import type { Either, Option } from "@shajara/kernel/utils";
import type { Failure, Presence, RiteCoroutine, RiteRoutine } from "#/contracts";
import { decodeRitual, encodeRitual, fromFailure, toFailureUnknown } from "#/boundary/index";
import { left, none, right, some } from "@shajara/kernel/utils";
import type { RecoveryHandler as KernelRecoveryHandler } from "@shajara/kernel";
import type { ScopeExitError } from "#/errors";
import { guard as kernelGuard } from "@shajara/kernel";
import { waitChild } from "#/primitives-kit";

export function* guard<Return>(
  entry: RiteRoutine<Return>,
  recover: RecoveryHandler,
): RiteCoroutine<Return> {
  const child = yield* encodeRitual(() =>
    kernelGuard(decodeRitual(entry), toKernelRecoveryHandler(recover)),
  )();
  return yield* waitChild(child);
}

export type RecoveryDecision = Presence<unknown>;
export type RecoveryHandler = (error: ScopeExitError) => RiteCoroutine<RecoveryDecision>;

function toKernelRecoveryHandler(recover: RecoveryHandler): KernelRecoveryHandler {
  return (failure) => decodeRitual(() => runRecoveryHandler(recover, fromFailure(failure)))();
}

function* runRecoveryHandler(
  recover: RecoveryHandler,
  recoveryCause: ScopeExitError,
): RiteCoroutine<Option<Either<Failure, unknown>>> {
  try {
    const [handled, value] = yield* recover(recoveryCause);
    if (!handled) {
      return none;
    }

    return some(right(value));
  } catch (error) {
    return some(left(toFailureUnknown(error)));
  }
}
