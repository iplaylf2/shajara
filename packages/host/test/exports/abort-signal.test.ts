import { CanceledError, abortSignal, createScope } from "#/index";
import { describe, expect, test } from "vitest";
import { future, wait } from "#/primitives";

describe("/ operations: abortSignal", () => {
  test.for([
    {
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
      outcome: {
        afterCancel: true,
        beforeCancel: false,
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
    } finally {
      if (scope.status !== "closed") {
        await expect(scope.cancel()).resolves.toBeUndefined();
      }
    }
  });
});

function* waitForCancellation() {
  const [pending] = yield* future<never>();
  return yield* wait(pending);
}
