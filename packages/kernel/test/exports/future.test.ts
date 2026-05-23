import {
  branch,
  cede,
  externalFailure,
  future,
  poll,
  settle,
  spawn,
  unfulfilledFailure,
  wait,
} from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExitedSucceeded } from "#test/harness";
import { isRight, isSome, left, none, right, some } from "#/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: future, poll, wait", () => {
  test.for([
    {
      given: [none] as const,
      outcome: none,
    },
    {
      given: [some(right("ready"))] as const,
      outcome: some(right("ready")),
    },
  ])(
    "returns the visible future state for the current settlement state",
    async ({ given: [settled], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          future<string>(),
          wisp.chain(([futureKey, futureSettle]) =>
            pipe(
              isSome(settled) ? settle(futureSettle, settled.value) : wisp.of(undefined),
              wisp.chain(() => poll(futureKey)),
            ),
          ),
        ),
      );
      const step = ritual.driveSync();
      const actual = unwrapExitedSucceeded(step);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [right("ready")] as const,
      outcome: right("ready"),
    },
    {
      given: [left(externalFailure("halted", "future-failed"))] as const,
      outcome: left(externalFailure("halted", "future-failed")),
    },
  ])(
    "returns the result produced by a spawned settlement",
    async ({ given: [settled], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          future<string>(),
          wisp.chain(([futureKey, futureSettle]) =>
            pipe(
              spawn(() =>
                pipe(
                  cede(),
                  wisp.chain(() => settle(futureSettle, settled)),
                ),
              ),
              wisp.chain(() => wait(futureKey)),
            ),
          ),
        ),
      );
      const step = await ritual.waitForClosed();
      const actual = unwrapExitedSucceeded(step);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [] as const,
      outcome: left(unfulfilledFailure()),
    },
  ])(
    "settles pending futures as unfulfilled when their owner scope closes",
    async ({ outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          branch(() =>
            pipe(
              future<string>(),
              wisp.map(([futureKey]) => futureKey),
            ),
          ),
          wisp.chain(({ scope }) => wait(scope.exitFuture)),
          wisp.chain((childResult) =>
            isRight(childResult) ? wait(childResult.right) : wisp.of(left(childResult.left)),
          ),
        ),
      );
      const step = await ritual.waitForClosed();
      const actual = unwrapExitedSucceeded(step);

      expect(actual).toEqual(outcome);
    },
  );
});
