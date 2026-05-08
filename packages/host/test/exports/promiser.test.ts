import { CanceledError, ScopeError, createScope, promiser, run, until } from "#/index";
import { describe, expect, test } from "vitest";
import { future, wait } from "#/primitives";

describe("/ operations: promiser", () => {
  test.for([
    {
      given: ["settled"] as const,
      outcome: "settled",
    },
  ])(
    "returns a promise whose resolution settles from host callbacks",
    async ({ given: [value], outcome }) => {
      const settled = run(function* settled() {
        const { promise, resolve } = yield* promiser<string>();

        globalThis.queueMicrotask(() => {
          resolve(value);
        });

        return yield* until(() => promise);
      });

      await expect(settled).resolves.toBe(outcome);
    },
  );

  test.for([
    {
      given: [new Error("promiser-failed")] as const,
      outcome: {
        cause: {
          kind: "external",
        },
        kind: "scope",
      } as const,
    },
  ])(
    "propagates the original error instance when the host rejects the promiser",
    async ({ given: [cause], outcome }) => {
      const settled = run(function* settled() {
        const { promise, reject } = yield* promiser<never>();

        globalThis.queueMicrotask(() => {
          reject(cause);
        });

        return yield* until(() => promise);
      });

      await expect(settled).rejects.toBeInstanceOf(ScopeError);
      await expect(settled).rejects.toMatchObject({
        ...outcome,
        cause: {
          ...outcome.cause,
          raw: cause,
        },
      });
    },
  );

  test.for([
    {
      given: [] as const,
      outcome: CanceledError,
    },
  ])("rejects its pending promise during normal owner-scope convergence", async ({ outcome }) => {
    const rejected = Promise.withResolvers<unknown>();

    await expect(
      createScope().run(function* exposePendingPromise() {
        const { promise } = yield* promiser<never>();
        rejected.resolve(promise.catch((error: unknown) => error));
      }),
    ).resolves.toBeUndefined();

    await expect(rejected.promise).resolves.toBeInstanceOf(outcome);
  });

  test.for([
    {
      given: [] as const,
      outcome: CanceledError,
    },
  ])("rejects its pending promise during owner-scope cancellation", async ({ outcome }) => {
    const scope = createScope();
    const rejected = Promise.withResolvers<unknown>();
    const started = Promise.withResolvers<null>();

    try {
      const settled = scope.run(function* keepScopeOpenAfterPromise() {
        const { promise } = yield* promiser<never>();
        rejected.resolve(promise.catch((error: unknown) => error));
        started.resolve(null);

        yield* waitForCancellation();
      });

      await started.promise;
      const settledCancellation = expect(settled).rejects.toBeInstanceOf(CanceledError);
      await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
      await settledCancellation;
      await expect(rejected.promise).resolves.toBeInstanceOf(outcome);
    } finally {
      if (scope.status !== "closed") {
        await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
      }
    }
  });
});

function* waitForCancellation() {
  const [pending] = yield* future<never>();
  return yield* wait(pending);
}
