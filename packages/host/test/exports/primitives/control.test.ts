import { CanceledError, createScope, run } from "#/index";
import { cede, future, wait } from "#/primitives";
import { describe, expect, test } from "vitest";

describe("/ primitives: cede", () => {
  test.for([
    {
      given: ["before", "after"] as const,
      outcome: ["before", "after"],
    },
  ])(
    "cede resumes the current routine after yielding cooperatively",
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
      outcome: {
        status: "closed",
      } as const,
    },
  ])("unsettled waits are canceled during scope convergence", async ({ outcome }) => {
    const scope = createScope();

    try {
      const settled = scope.run(function* waitForUnsettledFuture() {
        const [pending] = yield* future<never>();
        yield* wait(pending);
      });

      const settledCancellation = expect(settled).rejects.toBeInstanceOf(CanceledError);
      await expect(scope.cancel()).resolves.toBeUndefined();
      await settledCancellation;
      expect(scope.status).toBe(outcome.status);
    } finally {
      if (scope.status !== outcome.status) {
        await expect(scope.cancel()).resolves.toBeUndefined();
      }
    }
  });
});
