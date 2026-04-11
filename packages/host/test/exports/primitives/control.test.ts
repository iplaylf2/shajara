import { CanceledError, createScope, run } from "#/index";
import { cede, park } from "#/primitives";
import { describe, expect, test } from "vitest";

describe("/ primitives: cede, park", () => {
  test.for([
    {
      given: ["before", "after"] as const,
      outcome: ["before", "after"],
    },
  ])(
    "cede resumes the current ritual after yielding cooperatively",
    async ({ given: [before, after], outcome }) => {
      const events: string[] = [];
      const settled = run(function* recordAroundCede() {
        events.push(before);
        yield* cede();
        events.push(after);
        return [...events] as const;
      });

      await expect(settled).resolves.toEqual(outcome);
    },
  );

  test.for([
    {
      given: [] as const,
      outcome: "closed",
    },
  ])("park keeps the ritual suspended until its scope is canceled", async ({ outcome }) => {
    const scope = createScope();

    try {
      const settled = scope.run(function* parkCurrentScope() {
        yield* park();
      });

      await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
      await expect(settled).rejects.toBeInstanceOf(CanceledError);
      expect(scope.status).toBe(outcome);
    } finally {
      if (scope.status !== "closed") {
        await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
      }
    }
  });
});
