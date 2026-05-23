import { UnfulfilledError, run } from "#/index";
import { branch, cede, future, poll, settle, spawn, wait } from "#/primitives";
import { describe, expect, test } from "vitest";

describe("/ primitives: future, poll, wait", () => {
  test.for([
    {
      given: [false, "ready"] as const,
      outcome: [false],
    },
    {
      given: [true, "ready"] as const,
      outcome: [true, "ready"],
    },
  ])(
    "returns the visible future state for the current settlement state",
    async ({ given: [isSettled, value], outcome }) => {
      const settled = run(function* inspectFutureState() {
        const [futureKey, futureSettle] = yield* future<string>();

        if (isSettled) {
          yield* settle(futureSettle, value);
        }

        return yield* poll(futureKey);
      });

      await expect(settled).resolves.toEqual(outcome);
    },
  );

  test.for([
    {
      given: [0] as const,
      outcome: [true, 0],
    },
    {
      given: [false] as const,
      outcome: [true, false],
    },
    {
      given: [""] as const,
      outcome: [true, ""],
    },
  ])("poll preserves settled falsy values", async ({ given: [value], outcome }) => {
    const settled = run(function* inspectFalsyFutureState() {
      const [futureKey, futureSettle] = yield* future<typeof value>();

      yield* settle(futureSettle, value);

      return yield* poll(futureKey);
    });

    await expect(settled).resolves.toEqual(outcome);
  });

  test.for([
    {
      given: ["ready"] as const,
      outcome: "ready",
    },
  ])(
    "wait returns the result produced by a spawned settlement",
    async ({ given: [value], outcome }) => {
      const settled = run(function* awaitSpawnedSettlement() {
        const [futureKey, futureSettle] = yield* future<string>();

        yield* spawn(function* settleFutureInBranch() {
          yield* cede();
          yield* settle(futureSettle, value);
        });

        return yield* wait(futureKey);
      });

      await expect(settled).resolves.toBe(outcome);
    },
  );

  test.for([
    {
      given: [] as const,
      outcome: {
        error: UnfulfilledError,
        kind: "unfulfilled",
        message: "Future was not fulfilled before its owner scope closed",
      } as const,
    },
  ])(
    "throws UnfulfilledError for a pending future whose owner scope closes",
    async ({ outcome }) => {
      const settled = run(function* observeUnfulfilledFuture() {
        const pending = yield* branch(function* createPendingFuture() {
          const [futureKey] = yield* future<string>();

          return futureKey;
        });

        try {
          return yield* wait(pending);
        } catch (error) {
          return error;
        }
      });

      await expect(settled).resolves.toBeInstanceOf(outcome.error);
      await expect(settled).resolves.toMatchObject({
        kind: outcome.kind,
        message: outcome.message,
      });
    },
  );
});
