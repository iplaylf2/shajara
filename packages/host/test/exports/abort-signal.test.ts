import { CanceledError, ScopeError, abortSignal, createScope } from "#/index";
import { describe, expect, test } from "vitest";
import { future, wait } from "#/primitives";

describe("/ operations: abortSignal", () => {
  test.for([
    {
      given: [] as const,
      outcome: {
        afterClose: true,
        beforeClose: false,
      },
    },
  ])("aborts the returned signal during normal owner-scope convergence", async ({ outcome }) => {
    const capturedSignal = Promise.withResolvers<AbortSignal>();

    await expect(
      createScope().run(function* useAbortSignal() {
        const signal = yield* abortSignal();
        capturedSignal.resolve(signal);
        return signal.aborted;
      }),
    ).resolves.toBe(outcome.beforeClose);

    const signal = await capturedSignal.promise;
    expect(signal.aborted).toBe(outcome.afterClose);
  });

  test.for([
    {
      given: [] as const,
      outcome: {
        afterCancel: true,
        beforeCancel: false,
        reasonError: CanceledError,
      },
    },
  ])("aborts the returned signal during owner-scope cancellation", async ({ outcome }) => {
    const scope = createScope();
    const capturedSignal = Promise.withResolvers<AbortSignal>();

    try {
      const settled = scope.run(function* waitWithAbortSignal() {
        const signal = yield* abortSignal();
        capturedSignal.resolve(signal);
        yield* waitForCancellation();
      });

      const signal = await capturedSignal.promise;
      expect(signal.aborted).toBe(outcome.beforeCancel);

      const settledCancellation = expect(settled).rejects.toBeInstanceOf(CanceledError);
      await expect(scope.cancel()).resolves.toBeUndefined();
      await settledCancellation;
      expect(signal.aborted).toBe(outcome.afterCancel);
      expect(signal.reason).toBeInstanceOf(outcome.reasonError);
    } finally {
      if (scope.status !== "closed") {
        await expect(scope.cancel()).resolves.toBeUndefined();
      }
    }
  });

  test.for([
    {
      given: [new Error("owner-scope-failed")] as const,
      outcome: {
        reason: {
          cause: {
            kind: "external",
          },
          kind: "scope",
        },
        reasonError: ScopeError,
      } as const,
    },
  ])(
    "aborts the returned signal with the owner-scope failure reason",
    async ({ given: [cause], outcome }) => {
      const capturedSignal = Promise.withResolvers<AbortSignal>();

      const scope = createScope();
      const settled = scope.run(function* failWithAbortSignal() {
        const signal = yield* abortSignal();
        capturedSignal.resolve(signal);
        throw cause;
      });
      const signal = await capturedSignal.promise;

      await expect(settled).rejects.toBeInstanceOf(ScopeError);
      expect(signal.aborted).toBe(true);
      expect(signal.reason).toBeInstanceOf(outcome.reasonError);
      expect(signal.reason).toMatchObject({
        ...outcome.reason,
        cause: {
          ...outcome.reason.cause,
          raw: cause,
        },
      });
      await expect(scope.closed).rejects.toBeInstanceOf(ScopeError);
    },
  );
});

function* waitForCancellation() {
  const [pending] = yield* future<never>();
  return yield* wait(pending);
}
