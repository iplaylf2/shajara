import { cede, future, poll, settle, spawn, wait } from "#/primitives";
import { describe, expect, test } from "vitest";
import { run } from "#/index";

describe("/ primitives: future, poll, wait", () => {
  test.for([
    {
      given: [false] as const,
      outcome: undefined,
    },
    {
      given: [true] as const,
      outcome: "ready",
    },
  ])(
    "returns the visible future state for the current settlement state",
    async ({ given: [isSettled], outcome }) => {
      const settled = run(function* inspectFutureState() {
        const [futureKey, futureSettle] = yield* future<string>();

        if (isSettled) {
          yield* settle(futureSettle, "ready");
        }

        return yield* poll(futureKey);
      });

      await expect(settled).resolves.toBe(outcome);
    },
  );

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
