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
    "all returns a settled future whose result preserves branch order",
    async ({ given: [branches], outcome }) => {
      const settled = run(function* awaitAllBranches() {
        const future = yield* all(
          branches.map(
            (branch) =>
              function* returnBranchValue() {
                return branch;
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
    "race returns a future settled by the first branch to complete",
    async ({ given: [fast, slow], outcome }) => {
      const settled = run(function* awaitRaceWinner() {
        const future = yield* race([
          function* slowBranch() {
            yield* cede();
            return slow;
          },
          function* fastBranch() {
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
});
