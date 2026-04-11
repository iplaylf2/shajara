import { CanceledError, createScope, until } from "#/index";
import { describe, expect, test } from "vitest";

describe("/ operations: createScope", () => {
  test.for([
    {
      given: ["settled"] as const,
      outcome: {
        afterCancel: "closed",
        afterRun: "open",
        beforeRun: "open",
      } as const,
    },
  ])(
    "runs rituals in a child scope that stays open until canceled",
    async ({ given: [value], outcome }) => {
      const scope = createScope();

      try {
        expect(scope.status).toBe(outcome.beforeRun);
        await expect(scope.run(() => until(() => Promise.resolve(value)))).resolves.toBe(value);
        expect(scope.status).toBe(outcome.afterRun);

        const cancelation = expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
        const closed = expect(scope.closed).rejects.toBeInstanceOf(CanceledError);

        await cancelation;
        await closed;
        expect(scope.status).toBe(outcome.afterCancel);
      } finally {
        if (scope.status !== "closed") {
          await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
        }
      }
    },
  );

  test.for([
    {
      given: [] as const,
      outcome: {
        afterCancel: "closed",
        beforeCancel: "open",
      } as const,
    },
  ])("cancels pending rituals when the scope closes", async ({ outcome }) => {
    const scope = createScope();
    const settled = expect(
      scope.run(() => until(() => createPendingPromise())),
    ).rejects.toBeInstanceOf(CanceledError);

    try {
      expect(scope.status).toBe(outcome.beforeCancel);

      const cancelation = expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
      const closed = expect(scope.closed).rejects.toBeInstanceOf(CanceledError);

      await cancelation;
      await closed;
      await settled;
      expect(scope.status).toBe(outcome.afterCancel);
    } finally {
      if (scope.status !== "closed") {
        await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
      }
    }
  });
});

function createPendingPromise(): Promise<never> {
  return new Promise<never>(() => {
    // Keep the promise pending until the scope is canceled.
  });
}
