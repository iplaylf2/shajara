import type { ArrayValues, NonEmptyTuple } from "type-fest";
import { decodeRituals, encodeRitual } from "#/boundary/index";
import { CanceledError } from "#/errors";
import type { RiteCoroutine } from "#/contracts";
import type { RiteRoutineTuple } from "#/boundary/index";
import type { ScopedOutcome } from "@shajara/kernel";
import { race as kernelRace } from "@shajara/kernel";
import { wait } from "./wait";

/**
 * Runs routines in a race scope and returns the first successful value.
 * Non-winning routines are canceled before the caller resumes.
 *
 * @returns First successful routine result.
 * @throws Shajara error when the race scope is canceled or fails.
 */
export function* race<const Returns extends NonEmptyTuple<unknown>>(
  routines: RiteRoutineTuple<Returns>,
): RiteCoroutine<ArrayValues<Returns>> {
  const outcome = yield* encodeRitual(() => kernelRace<Returns>(decodeRituals(routines)))();
  return yield* waitRaceOutcome(outcome);
}

function* waitRaceOutcome<Return>([scope, future]: ScopedOutcome<Return>): RiteCoroutine<Return> {
  try {
    yield* wait(scope.exitFuture);
  } catch (scopeError) {
    if (scopeError instanceof CanceledError) {
      return yield* wait(future);
    }

    throw scopeError;
  }

  return yield* wait(future);
}
