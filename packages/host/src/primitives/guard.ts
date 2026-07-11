import type { Either, Option } from "@shajara/kernel/utils";
import type { Failure, Presence, RiteCoroutine, RiteRoutine } from "#/contracts/index.js";
import { decodeRitual, encodeRitual, fromFailure, toFailureUnknown } from "#/boundary/index.js";
import { left, none, right, some } from "@shajara/kernel/utils";
import type { RecoveryHandler as KernelRecoveryHandler } from "@shajara/kernel";
import type { ScopeExitError } from "#/errors/index.js";
import { guard as kernelGuard } from "@shajara/kernel";
import { waitChild } from "#/primitives-kit/index.js";

/**
 * Runs a child routine with a recovery boundary for nested `resumable(...)` work.
 *
 * @returns Child routine result.
 * @throws Error when the guarded scope is canceled or fails.
 */
export function* guard<Return>(
  routine: RiteRoutine<Return>,
  recover: RecoveryHandler,
): RiteCoroutine<Return> {
  const child = yield* encodeRitual(() =>
    kernelGuard(decodeRitual(routine), toKernelRecoveryHandler(recover)),
  )();
  return yield* waitChild(child);
}

/** Recovery result where `[true, value]` handles the request and `[false]` delegates it. */
export type RecoveryDecision = Presence<unknown>;

/** Recovery handler for scope-exit errors reported by nested `resumable(...)` waits. */
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
