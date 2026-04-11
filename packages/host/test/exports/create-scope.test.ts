import { CanceledError, ScopeError, createScope, until } from "#/index";
import { defer, park } from "#/primitives";
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

  test.for([
    {
      given: [] as const,
      outcome: "closed",
    },
  ])(
    "Symbol.asyncDispose closes the scope through the same cancellation path",
    async ({ outcome }) => {
      const scope = createScope();

      await expect(scope[Symbol.asyncDispose]()).rejects.toBeInstanceOf(CanceledError);
      await expect(scope.closed).rejects.toBeInstanceOf(CanceledError);
      expect(scope.status).toBe(outcome);
    },
  );

  test.for([
    {
      given: [] as const,
      outcome: "Cannot launch ritual with an illegal scope.",
    },
  ])(
    "throws when asked to run a ritual after the scope has already closed",
    async ({ outcome }) => {
      const scope = createScope();

      await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);

      expect(() => scope.run(() => until(() => Promise.resolve("late")))).toThrow(outcome);
    },
  );

  test.for([
    {
      given: [] as const,
      outcome: {
        firstCancel: "canceled",
        secondCancel: "canceled",
      } as const,
    },
  ])(
    "reuses the settled close result when cancel is called after the scope already closed",
    async ({ outcome }) => {
      const scope = createScope();

      await expect(scope.cancel()).rejects.toMatchObject({ kind: outcome.firstCancel });
      await expect(scope.cancel()).rejects.toMatchObject({ kind: outcome.secondCancel });
    },
  );

  test.for([
    {
      given: [new Error("cleanup-failed-during-close")] as const,
      outcome: {
        cause: {
          failure: {
            kind: "external",
          },
          kind: "process",
        },
        kind: "scope",
      } as const,
    },
  ])(
    "surfaces deferred cleanup exceptions through the running ritual result",
    async ({ given: [cause], outcome }) => {
      const scope = createScope();
      const settled = scope.run(function* runWithFailingCleanup() {
        yield* defer(function* throwDuringCleanup() {
          throw cause;
        });
        yield* park();
      });

      const cancelation = await Promise.resolve(scope.cancel()).catch((error: unknown) => error);
      const closed = await Promise.resolve(scope.closed).catch((error: unknown) => error);
      const execution = await Promise.resolve(settled).catch((error: unknown) => error);

      expect(cancelation).toBeInstanceOf(CanceledError);
      expect(closed).toBeInstanceOf(CanceledError);
      expect(execution).toBeInstanceOf(ScopeError);
      expect(execution).toMatchObject({
        ...outcome,
        cause: {
          ...outcome.cause,
          failure: {
            ...outcome.cause.failure,
            raw: cause,
          },
        },
      });
    },
  );
});

function createPendingPromise(): Promise<never> {
  return new Promise<never>(() => {
    // Keep the promise pending until the scope is canceled.
  });
}
