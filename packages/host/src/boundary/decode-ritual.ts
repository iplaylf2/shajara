import type { Failure, RiteCoroutine, RiteRoutine } from "#/contracts";
import type { Ritual, Wisp } from "@shajara/kernel";
import { cancel, halt, restingWisp, stirringWisp } from "@shajara/kernel";
import { isLeft, tryCatch } from "@shajara/kernel/utils";
import { CanceledError } from "#/errors";
import type { Sigil } from "@shajara/kernel/sigils";
import { defer } from "@shajara/kernel/sigils";
import { toFailureUnknown } from "./failure-mapping";

/**
 * Converts a `RiteRoutine` into a kernel `Ritual`.
 *
 * @param routine - Routine to convert.
 * @returns Ritual that converts thrown values into failures.
 */
export function decodeRitual<Relic>(routine: RiteRoutine<Relic>): Ritual<Relic> {
  function decoded(): Wisp<Relic> {
    const startedRoutine = tryCatch(routine, toFailureUnknown);
    if (isLeft(startedRoutine)) {
      return lowerThrownFailure(startedRoutine.left);
    }

    const coroutine = startedRoutine.right;

    return stirringWisp(
      defer(() => lowerCoroutineReturn(coroutine) as Wisp<void>),
      () => lowerCoroutineNext(coroutine, null),
    );
  }

  return decoded;
}

function lowerCoroutineNext<Relic>(
  coroutine: RiteCoroutine<Relic>,
  response: unknown,
): Wisp<Relic> {
  const nextStep = tryCatch(() => coroutine.next(response), toFailureUnknown);
  if (isLeft(nextStep)) {
    return lowerThrownFailure(nextStep.left);
  }

  return lowerCoroutineStep(coroutine, nextStep.right);
}

function lowerCoroutineStep<Relic>(
  coroutine: RiteCoroutine<Relic>,
  step: IteratorResult<Sigil, Relic>,
): Wisp<Relic> {
  if (step.done) {
    return restingWisp(step.value);
  }

  return stirringWisp(step.value, (response) => lowerCoroutineNext(coroutine, response));
}

function lowerCoroutineReturn<Relic>(coroutine: RiteCoroutine<Relic>): Wisp<Relic> {
  const nextStep = tryCatch(() => coroutine.return(null as Relic), toFailureUnknown);
  if (isLeft(nextStep)) {
    return lowerThrownFailure(nextStep.left);
  }

  return lowerCoroutineStep(coroutine, nextStep.right);
}

function lowerThrownFailure<Relic>(failure: Failure): Wisp<Relic> {
  return failure instanceof CanceledError ? cancel() : halt(failure);
}
