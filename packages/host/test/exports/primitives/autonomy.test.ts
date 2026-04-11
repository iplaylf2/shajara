import { ScopeError, run, until } from "#/index";
import { autonomy, cancel, defer, park, spawn, wait } from "#/primitives";
import { describe, expect, test } from "vitest";

describe("/ primitives: autonomy", () => {
  test.for([
    {
      given: ["autonomy-ready"] as const,
      outcome: "autonomy-ready",
    },
  ])(
    "returns a future whose result resolves from the autonomous ritual",
    async ({ given: [value], outcome }) => {
      const settled = run(function* awaitAutonomousResult() {
        const future = yield* autonomy(
          function* runAutonomousEntry() {
            return value;
          },
          {
            reaper: keepWaiting,
          },
        );

        return yield* wait(future);
      });

      await expect(settled).resolves.toBe(outcome);
    },
  );

  test.for([
    {
      given: [] as const,
      outcome: {
        canceled: {
          kind: "canceled",
        },
        kind: "scope",
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
        const future = yield* autonomy(
          function* runAutonomousEntry() {
            yield* defer(function* waitForCleanupRelease() {
              yield* until(() => release.promise);
            });
            yield* spawn(cancel);
            yield* park();
          },
          {
            reaper: function* keepWaitingDuringAdjudication(scope) {
              reaped.resolve(scope);
              release.resolve();
            },
          },
        );

        return yield* wait(future);
      });

      await expect(reaped.promise).resolves.toEqual(outcome.reaped ? expect.anything() : null);
      const actual = await Promise.resolve(settled).catch((error: unknown) => error);

      expect(actual).toBeInstanceOf(ScopeError);
      expect(actual).toMatchObject({ kind: outcome.kind });
      expect(findFailureByKind(actual, "canceled")).toMatchObject(outcome.canceled);
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
        const future = yield* autonomy(
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

        return yield* wait(future);
      });

      const actual = await Promise.resolve(settled).catch((error: unknown) => error);

      expect(actual).toBeInstanceOf(ScopeError);
      expect(actual).toMatchObject({ kind: outcome.kind });
      expect(findFailureByKind(actual, "interrupted")).toMatchObject({
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
        const future = yield* autonomy(
          function* runAutonomousEntry() {
            yield* defer(function* keepAutonomousCleanupPending() {
              yield* park();
            });
            yield* spawn(cancel);
            yield* park();
          },
          {
            reaper: function* failAdjudication() {
              throw cause;
            },
          },
        );

        return yield* wait(future);
      });

      const actual = await Promise.resolve(settled).catch((error: unknown) => error);

      expect(actual).toBeInstanceOf(ScopeError);
      expect(actual).toMatchObject({ kind: outcome.kind });
      expect(findFailureByKind(actual, "external")).toMatchObject({
        ...outcome.external,
        raw: cause,
      });
    },
  );
});

function* keepWaiting() {
  // Keep waiting until the autonomous entry settles.
}

function findFailureByKind(value: unknown, kind: string): unknown {
  if (!value || typeof value !== "object") {
    return null;
  }

  const failure = value as {
    cause?: { failure?: unknown };
    kind?: string;
    suppressed?: readonly unknown[];
  };
  if (failure.kind === kind) {
    return failure;
  }

  const nested = failure.cause?.failure;
  if (nested) {
    const foundNested = findFailureByKind(nested, kind);
    if (foundNested !== null) {
      return foundNested;
    }
  }

  for (const suppressed of failure.suppressed ?? []) {
    const foundSuppressed = findFailureByKind(suppressed, kind);
    if (foundSuppressed !== null) {
      return foundSuppressed;
    }
  }

  return null;
}
