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
    "runs routines in a child scope that stays open until canceled",
    async ({ given: [value], outcome }) => {
      const scope = createScope();

      try {
        expect(scope.status).toBe(outcome.beforeRun);
        await expect(scope.run(() => until(() => Promise.resolve(value)))).resolves.toBe(value);
        expect(scope.status).toBe(outcome.afterRun);

        const cancelation = expect(scope.cancel()).resolves.toBeUndefined();
        const closed = expect(scope.closed).rejects.toBeInstanceOf(CanceledError);

        await cancelation;
        await closed;
        expect(scope.status).toBe(outcome.afterCancel);
      } finally {
        if (scope.status !== "closed") {
          await expect(scope.cancel()).resolves.toBeUndefined();
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
  ])("cancels pending routines during scope cancellation", async ({ outcome }) => {
    const scope = createScope();
    const settled = expect(
      scope.run(() => until(() => createPendingPromise())),
    ).rejects.toBeInstanceOf(CanceledError);

    try {
      expect(scope.status).toBe(outcome.beforeCancel);

      const cancelation = expect(scope.cancel()).resolves.toBeUndefined();
      const closed = expect(scope.closed).rejects.toBeInstanceOf(CanceledError);

      await cancelation;
      await closed;
      await settled;
      expect(scope.status).toBe(outcome.afterCancel);
    } finally {
      if (scope.status !== "closed") {
        await expect(scope.cancel()).resolves.toBeUndefined();
      }
    }
  });

  test.for([
    {
      given: [new Error("run-failed")] as const,
      outcome: {
        scopeCause: {
          cause: {
            kind: "external",
          },
          kind: "scope",
        },
        workCause: {
          kind: "external",
        },
        workKind: "scope",
      } as const,
    },
  ])("propagates routine failures to the managed scope", async ({ given: [cause], outcome }) => {
    const scope = createScope();
    const settled = scope.run(function* failManagedScope() {
      throw cause;
    });

    await expect(settled).rejects.toBeInstanceOf(ScopeError);
    await expect(settled).rejects.toMatchObject({
      cause: {
        ...outcome.workCause,
        raw: cause,
      },
      kind: outcome.workKind,
    });
    await expect(scope.closed).rejects.toBeInstanceOf(ScopeError);
    await expect(scope.closed).rejects.toMatchObject({
      cause: {
        ...outcome.scopeCause,
        cause: {
          ...outcome.scopeCause.cause,
          raw: cause,
        },
      },
      kind: outcome.workKind,
    });
  });

  test.for([
    {
      given: [] as const,
      outcome: {
        afterCancel: "closed",
        afterRunCancellation: "open",
      } as const,
    },
  ])("keeps the managed scope open after routine cancellation", async ({ outcome }) => {
    const scope = createScope();

    try {
      const settled = scope.run(function* cancelManagedScope() {
        throw new CanceledError();
      });

      await expect(settled).rejects.toBeInstanceOf(CanceledError);
      expect(scope.status).toBe(outcome.afterRunCancellation);

      const closedCancellation = expect(scope.closed).rejects.toBeInstanceOf(CanceledError);
      await expect(scope.cancel()).resolves.toBeUndefined();
      await closedCancellation;
      expect(scope.status).toBe(outcome.afterCancel);
    } finally {
      if (scope.status !== "closed") {
        await expect(scope.cancel()).resolves.toBeUndefined();
      }
    }
  });

  test.for([
    {
      given: [] as const,
      outcome: {
        afterCancel: "closed",
        afterSignalAbort: "open",
      } as const,
    },
  ])("keeps the managed scope open after signal cancellation", async ({ outcome }) => {
    const controller = new globalThis.AbortController();
    const scope = createScope();

    try {
      const settled = scope.run(() => until(() => createPendingPromise()), {
        signal: controller.signal,
      });

      controller.abort();

      await expect(settled).rejects.toBeInstanceOf(CanceledError);
      expect(scope.status).toBe(outcome.afterSignalAbort);

      const closedCancellation = expect(scope.closed).rejects.toBeInstanceOf(CanceledError);
      await expect(scope.cancel()).resolves.toBeUndefined();
      await closedCancellation;
      expect(scope.status).toBe(outcome.afterCancel);
    } finally {
      if (scope.status !== "closed") {
        await expect(scope.cancel()).resolves.toBeUndefined();
      }
    }
  });

  test.for([
    {
      given: [new Error("signal-abort-failed")] as const,
      outcome: {
        scopeCause: {
          cause: {
            kind: "external",
          },
          kind: "scope",
        },
        workCause: {
          kind: "external",
        },
        workKind: "scope",
      } as const,
    },
  ])(
    "propagates signal abort failures to the managed scope",
    async ({ given: [cause], outcome }) => {
      const controller = new globalThis.AbortController();
      const scope = createScope();
      const settled = scope.run(() => until(() => createPendingPromise()), {
        signal: controller.signal,
      });

      controller.abort(cause);

      await expect(settled).rejects.toBeInstanceOf(ScopeError);
      await expect(settled).rejects.toMatchObject({
        cause: {
          ...outcome.workCause,
          raw: cause,
        },
        kind: outcome.workKind,
      });
      await expect(scope.closed).rejects.toBeInstanceOf(ScopeError);
      await expect(scope.closed).rejects.toMatchObject({
        cause: {
          ...outcome.scopeCause,
          cause: {
            ...outcome.scopeCause.cause,
            raw: cause,
          },
        },
        kind: outcome.workKind,
      });
    },
  );

  test.for([
    {
      given: [new Error("signal-abort-before-run-failed")] as const,
      outcome: {
        scopeCause: {
          cause: {
            kind: "external",
          },
          kind: "scope",
        },
        workCause: {
          kind: "external",
        },
        workKind: "scope",
      } as const,
    },
  ])(
    "propagates already-aborted signal failures to the managed scope",
    async ({ given: [cause], outcome }) => {
      const controller = new globalThis.AbortController();
      controller.abort(cause);
      const scope = createScope();
      const settled = scope.run(() => until(() => createPendingPromise()), {
        signal: controller.signal,
      });

      await expect(settled).rejects.toBeInstanceOf(ScopeError);
      await expect(settled).rejects.toMatchObject({
        cause: {
          ...outcome.workCause,
          raw: cause,
        },
        kind: outcome.workKind,
      });
      await expect(scope.closed).rejects.toBeInstanceOf(ScopeError);
      await expect(scope.closed).rejects.toMatchObject({
        cause: {
          ...outcome.scopeCause,
          cause: {
            ...outcome.scopeCause.cause,
            raw: cause,
          },
        },
        kind: outcome.workKind,
      });
    },
  );

  test.for([
    {
      given: [] as const,
      outcome: "closed",
    },
  ])(
    "Symbol.asyncDispose closes the scope through the same cancellation path",
    async ({ outcome }) => {
      const scope = createScope();

      const closedCancellation = expect(scope.closed).rejects.toBeInstanceOf(CanceledError);
      await expect(scope[Symbol.asyncDispose]()).resolves.toBeUndefined();
      await closedCancellation;
      expect(scope.status).toBe(outcome);
    },
  );

  test.for([
    {
      given: ["late"] as const,
      outcome: "Cannot launch routine with an illegal scope.",
    },
  ])(
    "throws when asked to run a routine after the scope has already closed",
    async ({ given: [value], outcome }) => {
      const scope = createScope();

      await expect(scope.cancel()).resolves.toBeUndefined();

      expect(() => scope.run(() => until(() => Promise.resolve(value)))).toThrow(outcome);
    },
  );

  test.for([
    {
      given: [] as const,
      outcome: {
        status: "closed",
      } as const,
    },
  ])(
    "suppresses the settled cancellation result when cancel is called after the scope already closed",
    async ({ outcome }) => {
      const scope = createScope();

      await expect(scope.cancel()).resolves.toBeUndefined();
      await expect(scope.cancel()).resolves.toBeUndefined();
      expect(scope.status).toBe(outcome.status);
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

        const settledCancellation = expect(settled).rejects.toBeInstanceOf(CanceledError);
        const closedCancellation = expect(scope.closed).rejects.toBeInstanceOf(CanceledError);
        await expect(scope.cancel()).resolves.toBeUndefined();
        await closedCancellation;
        await settledCancellation;
        expect(events).toEqual(outcome);
      } finally {
        if (scope.status !== "closed") {
          await expect(scope.cancel()).resolves.toBeUndefined();
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
    "runs RiteRoutine finally blocks when cancellation unwinds a started routine",
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
        const settledCancellation = expect(settled).rejects.toBeInstanceOf(CanceledError);
        const closedCancellation = expect(scope.closed).rejects.toBeInstanceOf(CanceledError);
        await expect(scope.cancel()).resolves.toBeUndefined();
        await closedCancellation;
        await settledCancellation;
        expect(events).toEqual(outcome);
      } finally {
        if (scope.status !== "closed") {
          await expect(scope.cancel()).resolves.toBeUndefined();
        }
      }
    },
  );

  test.for([
    {
      given: [new Error("finally-failed-during-close")] as const,
      outcome: {
        cause: {
          kind: "external",
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
      const settledError = settled.catch((error: unknown) => error);

      await started.promise;
      const closedCancellation = expect(scope.closed).rejects.toBeInstanceOf(CanceledError);
      const cancelation = scope.cancel();

      await expect(cancelation).resolves.toBeUndefined();
      await closedCancellation;
      await expect(settledError).resolves.toBeInstanceOf(ScopeError);
      await expect(settledError).resolves.toMatchObject({
        ...outcome,
        cause: {
          ...outcome.cause,
          raw: cause,
        },
      });
    },
  );
});
