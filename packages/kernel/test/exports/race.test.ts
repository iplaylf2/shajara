import { branch, canceledFailure, cede, defer, race, spawn } from "#/index";
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
        scopeExit: left(canceledFailure),
        winner: "fast",
      },
    },
  ])(
    "returns a branch handle whose entry process exposes the winner future",
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
      const handle = unwrapExitedSucceeded(step);
      const winnerFuture = unwrapRight(await ritual.waitForFuture(handle.process.exitFuture));
      const actual = unwrapRight(await ritual.waitForFuture(winnerFuture));
      const scopeExit = await ritual.waitForFuture(handle.scope.exitFuture);

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
        scopeExit: left(canceledFailure),
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
      const handle = unwrapExitedSucceeded(step);
      const winnerFuture = unwrapRight(await ritual.waitForFuture(handle.process.exitFuture));

      expect(unwrapRight(await ritual.waitForFuture(winnerFuture))).toBe(outcome.winner);
      expect(await ritual.waitForFuture(handle.scope.exitFuture)).toEqual(outcome.scopeExit);
      expect(events).toHaveLength(outcome.cleanups.length);
      expect(events).toEqual(expect.arrayContaining([...outcome.cleanups]));
    },
  );
});
