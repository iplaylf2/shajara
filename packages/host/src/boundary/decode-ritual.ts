import type { RiteCoroutine, RiteRoutine } from "#src/contracts";
import type { Ritual, Wisp } from "@shajara/kernel";
import { ensureExecutor, halt, restingWisp, stirringWisp } from "@shajara/kernel";
import { isLeft, tryCatch } from "@shajara/kernel/utils";
import type { Sigil } from "@shajara/kernel/sigils";
import { toFailureUnknown } from "./failure-mapping";

export function decodeRitual<Relic>(routine: RiteRoutine<Relic>): Ritual<Relic> {
  function decoded(): Wisp<Relic> {
    const startedRoutine = tryCatch(() => routine(), toFailureUnknown);
    if (isLeft(startedRoutine)) {
      return halt(startedRoutine.left);
    }

    const coroutine = startedRoutine.right;

    const executor = ensureExecutor();
    executor.registerCleanup(decoded, () => lowerCoroutineReturn(coroutine) as Wisp<void>);

    return lowerCoroutineNext(coroutine, null);
  }

  return decoded;
}

function lowerCoroutineNext<Relic>(
  coroutine: RiteCoroutine<Relic>,
  response: unknown,
): Wisp<Relic> {
  const nextStep = tryCatch(() => coroutine.next(response), toFailureUnknown);
  if (isLeft(nextStep)) {
    return halt(nextStep.left);
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
    return halt(nextStep.left);
  }

  return lowerCoroutineStep(coroutine, nextStep.right);
}
