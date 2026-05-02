import type { ArrayValues, NonEmptyTuple } from "type-fest";
import { decodeRituals, encodeRitual } from "#/boundary/index";
import { CanceledError } from "#/errors";
import type { RiteCoroutine } from "#/contracts";
import type { RiteRoutineTuple } from "#/boundary/index";
import type { ScopedOutcome } from "@shajara/kernel";
import { race as kernelRace } from "@shajara/kernel";
import { wait } from "./wait";

export function* race<Returns extends NonEmptyTuple<unknown>>(
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
