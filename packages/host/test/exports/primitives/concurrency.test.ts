import { all, cede, enclose, race, spawn, wait } from "#/primitives";
import { describe, expect, test } from "vitest";
import { run } from "#/index";

describe("/ primitives: all, race, spawn, enclose", () => {
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
        const future = yield* all(
          values.map(
            (value) =>
              function* returnRoutineValue() {
                return value;
              },
          ),
        );

        return yield* wait(future);
      });

      await expect(settled).resolves.toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["fast", "slow"] as const,
      outcome: "fast",
    },
  ])(
    "race returns a future settled by the first routine to complete",
    async ({ given: [fast, slow], outcome }) => {
      const settled = run(function* awaitRaceWinner() {
        const future = yield* race([
          function* slowRoutine() {
            yield* cede();
            return slow;
          },
          function* fastRoutine() {
            return fast;
          },
        ] as const);

        return yield* wait(future);
      });

      await expect(settled).resolves.toBe(outcome);
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
        const future = yield* spawn(function* returnSpawnedValue() {
          return value;
        });

        return yield* wait(future);
      });

      await expect(settled).resolves.toBe(outcome);
    },
  );

  test.for([
    {
      given: ["enclosed"] as const,
      outcome: "enclosed",
    },
  ])(
    "enclose returns the child result when the enclosed scope completes",
    async ({ given: [value], outcome }) => {
      const settled = run(function* awaitEnclosedResult() {
        return yield* enclose(function* returnEnclosedValue() {
          return value;
        });
      });

      await expect(settled).resolves.toBe(outcome);
    },
  );

  test.for([
    {
      given: ["body", "cleanup"] as const,
      outcome: {
        cleanup: ["body", "cleanup"],
        result: ["body"],
      },
    },
    {
      given: ["body", "cleanup:1", "cleanup:2"] as const,
      outcome: {
        cleanup: ["body", "cleanup:1", "cleanup:2"],
        result: ["body"],
      },
    },
  ])(
    "enclose waits for generator finally cleanup after the child produces its result",
    async ({ given, outcome }) => {
      const [bodyEntry, firstCleanup, secondCleanup] = given;
      const events: string[] = [];
      const settled = run(function* awaitFinallyCleanup() {
        return yield* enclose(function* runWithFinallyCleanup() {
          try {
            events.push(bodyEntry);
            return [...events] as const;
          } finally {
            events.push(firstCleanup);

            if (secondCleanup !== undefined) {
              events.push(secondCleanup);
            }
          }
        });
      });

      await expect(settled).resolves.toEqual(outcome.result);
      expect(events).toEqual(outcome.cleanup);
    },
  );
});
