import {
  branch,
  canceledFailure,
  cede,
  defer,
  externalFailure,
  halt,
  park,
  race,
  spawn,
} from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, recordTrace, unwrapExitedSucceeded, unwrapRight } from "#test/harness";
import { left, noop } from "#/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: race", () => {
  test.for([
    {
      given: ["fast", "slow"] as const,
      outcome: {
        scopeExit: left(canceledFailure()),
        winner: "fast",
      },
    },
  ])(
    "returns a scoped outcome whose outcome future is the winner",
    async ({ given: [fast, slow], outcome }) => {
      await using ritual = interpretRitual(() =>
        race([
          () =>
            pipe(
              cede(),
              wisp.chain(() => cede()),
              wisp.chain(() => wisp.of(slow)),
            ),
          () =>
            pipe(
              cede(),
              wisp.chain(() => wisp.of(fast)),
            ),
        ] as const),
      );
      const step = ritual.driveSync();
      const [scope, winnerFuture] = unwrapExitedSucceeded(step);
      const actual = unwrapRight(await ritual.waitForFuture(winnerFuture));
      const scopeExit = await ritual.waitForFuture(scope.exitFuture);

      expect(actual).toBe(outcome.winner);
      expect(scopeExit).toEqual(outcome.scopeExit);
    },
  );

  test.for([
    {
      given: [
        "fast",
        "slow",
        {
          branchCleanup: "branch cleanup",
          branchResult: "branch completed",
          spawnCleanup: "spawn cleanup",
          spawnResult: "spawn completed",
        },
      ] as const,
      outcome: {
        cleanups: ["branch cleanup", "spawn cleanup"] as const,
        scopeExit: left(canceledFailure()),
        winner: "fast",
      },
    },
  ])(
    "cancels losing structural work created through branch and spawn",
    async ({ given: [fast, slow, trace], outcome }) => {
      const events: string[] = [];

      await using ritual = interpretRitual(() =>
        race([
          () =>
            pipe(
              spawn(() =>
                pipe(
                  defer(() => pipe(recordTrace(events, trace.spawnCleanup), wisp.map(noop))),
                  wisp.chain(() => cede()),
                  wisp.chain(() => cede()),
                  wisp.chain(() => wisp.of(trace.spawnResult)),
                ),
              ),
              wisp.chain(() =>
                branch(() =>
                  pipe(
                    defer(() => pipe(recordTrace(events, trace.branchCleanup), wisp.map(noop))),
                    wisp.chain(() => cede()),
                    wisp.chain(() => cede()),
                    wisp.chain(() => wisp.of(trace.branchResult)),
                  ),
                ),
              ),
              wisp.chain(() => cede()),
              wisp.chain(() => cede()),
              wisp.chain(() => wisp.of(slow)),
            ),
          () =>
            pipe(
              cede(),
              wisp.chain(() => wisp.of(fast)),
            ),
        ] as const),
      );
      const step = ritual.driveSync();
      const [scope, winnerFuture] = unwrapExitedSucceeded(step);

      expect(unwrapRight(await ritual.waitForFuture(winnerFuture))).toBe(outcome.winner);
      expect(await ritual.waitForFuture(scope.exitFuture)).toEqual(outcome.scopeExit);
      expect(events).toHaveLength(outcome.cleanups.length);
      expect(events).toEqual(expect.arrayContaining([...outcome.cleanups]));
    },
  );

  test.for([
    {
      given: [externalFailure("halted", "race entrant failed")] as const,
      outcome: {
        scopeExit: left(scopeFailureCausedBy(externalFailure("halted", "race entrant failed"))),
        winner: left(scopeFailureCausedBy(externalFailure("halted", "race entrant failed"))),
      },
    },
  ])(
    "settles the outcome future when the race scope fails before a winner",
    async ({ given: [failure], outcome }) => {
      await using ritual = interpretRitual(() =>
        race([() => halt(failure), () => park()] as const),
      );
      const step = ritual.driveSync();
      const [scope, winnerFuture] = unwrapExitedSucceeded(step);
      const actual = {
        scopeExit: await ritual.waitForFuture(scope.exitFuture),
        winner: await ritual.waitForFuture(winnerFuture),
      };

      expect(actual).toEqual(outcome);
    },
  );
});

function scopeFailureCausedBy(failure: unknown) {
  return expect.objectContaining({
    cause: failure,
    kind: "scope",
  });
}
