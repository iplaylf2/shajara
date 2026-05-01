import { cede, future, poll, settle, spawn, wait } from "#/primitives";
import { describe, expect, test } from "vitest";
import { run } from "#/index";

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
});
