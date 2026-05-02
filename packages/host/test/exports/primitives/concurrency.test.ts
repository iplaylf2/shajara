import { ScopeError, run } from "#/index";
import { all, branch, cede, race, spawn, wait } from "#/primitives";
import { describe, expect, test } from "vitest";

describe("/ primitives: all, branch, race, spawn", () => {
  test.for([
    {
      given: [["alpha", "beta"] as const] as const,
      outcome: ["alpha", "beta"],
    },
    {
      given: [[] as const] as const,
      outcome: [] as const,
    },
  ])(
    "all returns a settled future whose result preserves routine order",
    async ({ given: [values], outcome }) => {
      const settled = run(function* awaitAllRoutines() {
        const orderedResults = yield* all(
          values.map(
            (value) =>
              function* returnRoutineValue() {
                return value;
              },
          ),
        );

        return yield* wait(orderedResults);
      });

      await expect(settled).resolves.toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["fast", "slow"] as const,
      outcome: "fast",
    },
  ])("race returns the first routine result", async ({ given: [fast, slow], outcome }) => {
    const settled = run(function* awaitRaceWinner() {
      return yield* race([
        function* slowRoutine() {
          yield* cede();
          return slow;
        },
        function* fastRoutine() {
          return fast;
        },
      ] as const);
    });

    await expect(settled).resolves.toBe(outcome);
  });

  test.for([
    {
      given: ["fast", "slow", "cleanup-start", "cleanup-end", "after-race"] as const,
      outcome: ["cleanup-start", "cleanup-end", "after-race"] as const,
    },
  ])(
    "race waits for losing routine cleanup before resuming the caller",
    async ({ given: [fast, slow, cleanupStart, cleanupEnd, afterRace], outcome }) => {
      const events: string[] = [];
      const settled = run(function* awaitRaceCleanup() {
        const winner = yield* race([
          function* slowRoutine() {
            try {
              yield* cede();
              yield* cede();
              return slow;
            } finally {
              events.push(cleanupStart);
              yield* cede();
              events.push(cleanupEnd);
            }
          },
          function* fastRoutine() {
            return fast;
          },
        ] as const);

        events.push(afterRace);

        return winner;
      });

      await expect(settled).resolves.toBe(fast);
      expect(events).toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["fast", "slow", new Error("losing cleanup failed")] as const,
      outcome: {
        cause: {
          kind: "external",
        },
        kind: "scope",
      },
    },
  ])(
    "race reports non-cancellation scope failure before returning a winner",
    async ({ given: [fast, slow, cause], outcome }) => {
      const settled = run(function* catchRaceScopeFailure() {
        try {
          return yield* race([
            function* slowRoutine() {
              try {
                yield* cede();
                yield* cede();
                return slow;
              } finally {
                failCleanup(cause);
              }
            },
            function* fastRoutine() {
              return fast;
            },
          ] as const);
        } catch (error) {
          if (!(error instanceof ScopeError)) {
            throw error;
          }

          return {
            cause: error.cause,
            kind: error.kind,
          };
        }
      });

      await expect(settled).resolves.toMatchObject({
        ...outcome,
        cause: {
          ...outcome.cause,
          raw: cause,
        },
      });
    },
  );

  test.for([
    {
      given: ["branched"] as const,
      outcome: "branched",
    },
  ])("branch returns the child value", async ({ given: [value], outcome }) => {
    const settled = run(function* awaitBranch() {
      return yield* branch(function* returnBranchValue() {
        return value;
      });
    });

    await expect(settled).resolves.toBe(outcome);
  });

  test.for([
    {
      given: ["body", "cleanup"] as const,
      outcome: ["body", "cleanup"],
    },
  ])(
    "branch waits for child scope cleanup before returning",
    async ({ given: [body, cleanup], outcome }) => {
      const events: string[] = [];
      const settled = run(function* awaitBranchCleanup() {
        return yield* branch(function* returnBeforeFinally() {
          try {
            events.push(body);
            return body;
          } finally {
            events.push(cleanup);
          }
        });
      });

      await expect(settled).resolves.toBe(body);
      expect(events).toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["spawned-done"] as const,
      outcome: "spawned-done",
    },
  ])(
    "spawn returns the spawned process exit future from a single primitive call",
    async ({ given: [value], outcome }) => {
      const settled = run(function* awaitSpawnedProcess() {
        const spawnedResult = yield* spawn(function* returnSpawnedValue() {
          return value;
        });

        return yield* wait(spawnedResult);
      });

      await expect(settled).resolves.toBe(outcome);
    },
  );
});

function failCleanup(cause: Error): never {
  throw cause;
}
