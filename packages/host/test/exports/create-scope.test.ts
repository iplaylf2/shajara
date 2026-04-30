import { CanceledError, ScopeError, createScope, until } from "#/index";
import { describe, expect, test } from "vitest";
import { createPendingPromise } from "#test/harness";

describe("/ entries: createScope", () => {
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
      given: ["cleanup"] as const,
      outcome: [] as string[],
    },
  ])(
    "does not run RiteRoutine finally blocks when synchronous cancellation wins before startup",
    async ({ given: [cleanupEntry], outcome }) => {
      const events: string[] = [];
      const scope = createScope();

      try {
        const settled = scope.run(function* runWithFinallyCleanup() {
          try {
            yield* until(createPendingPromise);
          } finally {
            events.push(cleanupEntry);
          }
        });

        await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
        await expect(scope.closed).rejects.toBeInstanceOf(CanceledError);
        await expect(settled).rejects.toBeInstanceOf(CanceledError);
        expect(events).toEqual(outcome);
      } finally {
        if (scope.status !== "closed") {
          await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
        }
      }
    },
  );

  test.for([
    {
      given: ["cleanup"] as const,
      outcome: ["cleanup"],
    },
  ])(
    "runs RiteRoutine finally blocks when cancellation unwinds a started ritual",
    async ({ given: [cleanupEntry], outcome }) => {
      const events: string[] = [];
      const started = Promise.withResolvers<null>();
      const scope = createScope();

      try {
        const settled = scope.run(function* runWithFinallyCleanup() {
          started.resolve(null);
          try {
            yield* until(createPendingPromise);
          } finally {
            events.push(cleanupEntry);
          }
        });

        await started.promise;
        await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
        await expect(scope.closed).rejects.toBeInstanceOf(CanceledError);
        await expect(settled).rejects.toBeInstanceOf(CanceledError);
        expect(events).toEqual(outcome);
      } finally {
        if (scope.status !== "closed") {
          await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
        }
      }
    },
  );

  test.for([
    {
      given: [new Error("finally-failed-during-close")] as const,
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
    "surfaces exceptions thrown from started RiteRoutine finally blocks during close",
    async ({ given: [cause], outcome }) => {
      const started = Promise.withResolvers<null>();
      const scope = createScope();
      const settled = scope.run(function* runWithFailingFinally() {
        started.resolve(null);
        try {
          yield* until(createPendingPromise);
        } finally {
          // Intentionally throw from finally to verify close propagates the failure.
          // oxlint-disable-next-line eslint/no-unsafe-finally
          throw cause;
        }
      });

      await started.promise;
      const cancelation = scope.cancel();

      await expect(cancelation).rejects.toBeInstanceOf(CanceledError);
      await expect(scope.closed).rejects.toBeInstanceOf(CanceledError);
      await expect(settled).rejects.toBeInstanceOf(ScopeError);
      await expect(settled).rejects.toMatchObject({
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
