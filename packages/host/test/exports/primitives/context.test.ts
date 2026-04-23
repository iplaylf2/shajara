import { bind, lookup, unbind } from "#/primitives";
import { contextKey, run } from "#/index";
import { describe, expect, test } from "vitest";

describe("/ primitives: bind, contextKey, lookup, unbind", () => {
  test.for([
    {
      given: [] as const,
      outcome: [false],
    },
  ])("lookup returns an absent tuple when a binding is absent", async ({ outcome }) => {
    const key = contextKey<string>();
    const settled = run(function* lookupMissingBinding() {
      return yield* lookup(key);
    });

    await expect(settled).resolves.toEqual(outcome);
  });

  test.for([
    {
      given: ["root"] as const,
      outcome: [true, "root"],
    },
  ])("bind makes the value visible in the current scope", async ({ given: [binding], outcome }) => {
    const key = contextKey<string>();
    const settled = run(function* lookupBoundValue() {
      yield* bind(key, binding);
      return yield* lookup(key);
    });

    await expect(settled).resolves.toEqual(outcome);
  });

  test.for([
    {
      given: ["root"] as const,
      outcome: {
        lookupResult: [false],
        unbindResult: undefined,
      },
    },
  ])(
    "unbind returns void and clears a host-visible binding",
    async ({ given: [binding], outcome }) => {
      const key = contextKey<string>();
      const settled = run(function* unbindBoundValue() {
        yield* bind(key, binding);

        const unbindResult = yield* unbind(key);
        const lookupResult = yield* lookup(key);

        return { lookupResult, unbindResult };
      });

      await expect(settled).resolves.toEqual(outcome);
    },
  );
});
