import { bind, enclose, lookup, unbind } from "#/primitives";
import { contextKey, run } from "#/index";
import { describe, expect, test } from "vitest";

describe("/ primitives: bind, contextKey, lookup, unbind", () => {
  test.for([
    {
      given: [] as const,
      outcome: undefined,
    },
  ])("lookup returns undefined when a binding is absent", async ({ outcome }) => {
    const key = contextKey<string>();
    const settled = run(function* lookupMissingBinding() {
      return yield* lookup(key);
    });

    await expect(settled).resolves.toBe(outcome);
  });

  test.for([
    {
      given: ["root"] as const,
      outcome: "root",
    },
  ])("bind makes the value visible in the current scope", async ({ given: [binding], outcome }) => {
    const key = contextKey<string>();
    const settled = run(function* lookupBoundValue() {
      yield* bind(key, binding);
      return yield* lookup(key);
    });

    await expect(settled).resolves.toBe(outcome);
  });

  test.for([
    {
      given: ["root"] as const,
      outcome: "root",
    },
  ])("enclosed lookup inherits the parent binding", async ({ given: [binding], outcome }) => {
    const key = contextKey<string>();
    const settled = run(function* lookupInheritedBinding() {
      yield* bind(key, binding);
      return yield* enclose(function* readParentBinding() {
        return yield* lookup(key);
      });
    });

    await expect(settled).resolves.toBe(outcome);
  });

  test.for([
    {
      given: ["root", "child"] as const,
      outcome: "child",
    },
  ])(
    "enclosed bind shadows the parent binding",
    async ({ given: [parentBinding, childBinding], outcome }) => {
      const key = contextKey<string>();
      const settled = run(function* lookupShadowedBinding() {
        yield* bind(key, parentBinding);
        return yield* enclose(function* readChildBinding() {
          yield* bind(key, childBinding);
          return yield* lookup(key);
        });
      });

      await expect(settled).resolves.toBe(outcome);
    },
  );

  test.for([
    {
      given: ["root", "child"] as const,
      outcome: "root",
    },
  ])(
    "enclosed unbind falls back to the parent binding",
    async ({ given: [parentBinding, childBinding], outcome }) => {
      const key = contextKey<string>();
      const settled = run(function* lookupFallbackBinding() {
        yield* bind(key, parentBinding);
        return yield* enclose(function* unbindChildBinding() {
          yield* bind(key, childBinding);
          yield* unbind(key);
          return yield* lookup(key);
        });
      });

      await expect(settled).resolves.toBe(outcome);
    },
  );
});
