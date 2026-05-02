import { CanceledError, ScopeError, run, until } from "#/index";
import { autonomy, future, spawn, wait } from "#/primitives";
import { describe, expect, test } from "vitest";
import type { RiteCoroutine } from "#/index";
import { findFailureByKind } from "#test/harness";

describe("/ primitives: autonomy", () => {
  test.for([
    {
      given: ["autonomy-ready"] as const,
      outcome: "autonomy-ready",
    },
  ])("returns the autonomous ritual result", async ({ given: [value], outcome }) => {
    const settled = run(function* awaitAutonomousResult() {
      return yield* autonomy(
        function* runAutonomousEntry() {
          return value;
        },
        {
          reaper: keepWaiting,
        },
      );
    });

    await expect(settled).resolves.toBe(outcome);
  });

  test.for([
    {
      given: [] as const,
      outcome: {
        kind: "canceled",
        reaped: true,
      } as const,
    },
  ])(
    "lets reaper adjudication continue waiting and preserves the autonomous close result",
    async ({ outcome }) => {
      // oxlint-disable no-invalid-void-type
      const release = Promise.withResolvers<void>();
      const reaped = Promise.withResolvers<unknown>();
      const settled = run(function* awaitReapedAutonomy() {
        return yield* autonomy(
          function* runAutonomousEntry() {
            try {
              yield* spawn(throwCancellation);
              yield* waitForCancellation();
            } finally {
              yield* until(() => release.promise);
            }
          },
          {
            reaper: function* reaper(scope) {
              reaped.resolve(scope);
              release.resolve();
            },
          },
        );
      });

      await expect(reaped.promise).resolves.toEqual(outcome.reaped ? expect.anything() : null);
      const actual = await settled.catch((error: unknown) => error);

      expect(actual).toBeInstanceOf(CanceledError);
      expect(actual).toMatchObject({ kind: outcome.kind });
    },
  );

  test.for([
    {
      given: [new Error("scheduler assignment failed"), "never-settled"] as const,
      outcome: {
        interrupted: {
          kind: "interrupted",
        },
        kind: "scope",
      } as const,
    },
  ])(
    "rejects with a scope failure that records scheduler assignment interruption",
    async ({ given: [cause, value], outcome }) => {
      const settled = run(function* awaitInterruptedAutonomy() {
        return yield* autonomy(
          function* runAutonomousEntry() {
            return value;
          },
          {
            scheduler: {
              assign() {
                throw cause;
              },
            },
          },
        );
      });

      const actual = await settled.catch((error: unknown) => error);

      expect(actual).toBeInstanceOf(ScopeError);
      expect(actual).toMatchObject({ kind: outcome.kind });
      expect(findFailureByKind(actual, outcome.interrupted.kind)).toMatchObject({
        ...outcome.interrupted,
        cause,
      });
    },
  );

  test.for([
    {
      given: [new Error("reaper adjudication failed")] as const,
      outcome: {
        external: {
          kind: "external",
        },
        kind: "scope",
      } as const,
    },
  ])(
    "rejects with a scope failure that preserves the reaper exception as an external cause",
    async ({ given: [cause], outcome }) => {
      const settled = run(function* awaitInterruptedAutonomy() {
        return yield* autonomy(
          function* runAutonomousEntry() {
            try {
              yield* spawn(throwCancellation);
              yield* waitForCancellation();
            } finally {
              yield* waitForCancellation();
            }
          },
          {
            reaper: function* reaper() {
              throw cause;
            },
          },
        );
      });

      const actual = await settled.catch((error: unknown) => error);

      expect(actual).toBeInstanceOf(ScopeError);
      expect(actual).toMatchObject({ kind: outcome.kind });
      expect(findFailureByKind(actual, outcome.external.kind)).toMatchObject({
        ...outcome.external,
        raw: cause,
      });
    },
  );
});

function* keepWaiting() {
  // Keep waiting until the autonomous entry settles.
}

function* waitForCancellation(): RiteCoroutine<never> {
  const [pending] = yield* future<never>();
  return yield* wait(pending);
}

function* throwCancellation(): RiteCoroutine<never> {
  throw new CanceledError();
}
