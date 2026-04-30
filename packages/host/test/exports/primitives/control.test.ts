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

  test("unsettled waits are canceled when their scope closes", async () => {
    const scope = createScope();

    try {
      const settled = scope.run(function* waitForUnsettledFuture() {
        const [pending] = yield* future<never>();
        yield* wait(pending);
      });

      await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
      await expect(settled).rejects.toBeInstanceOf(CanceledError);
      expect(scope.status).toBe("closed");
    } finally {
      if (scope.status !== "closed") {
        await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
      }
    }
  });
});
