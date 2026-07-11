import { decodeRituals, encodeRitual } from "#/boundary/index.js";
import { CanceledError } from "#/errors/index.js";
import type { RiteCoroutine } from "#/contracts/index.js";
import type { RiteRoutineTuple } from "#/boundary/index.js";
import type { ScopedOutcome } from "@shajara/kernel";
import { race as kernelRace } from "@shajara/kernel";
import { wait } from "./wait.js";

/**
 * Runs routines in a race scope and returns the first successful value.
 * Non-winning routines are canceled before the caller resumes.
 *
 * @returns First successful routine result.
 * @throws Error when the race scope is canceled or fails.
 */
export function* race<const Returns extends readonly [unknown, ...unknown[]]>(
  routines: RiteRoutineTuple<Returns>,
): RiteCoroutine<Returns[number]> {
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
