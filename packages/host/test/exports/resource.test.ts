import { CanceledError, createScope, resource } from "#/index";
import { describe, expect, test } from "vitest";
import { future, wait } from "#/primitives";

describe("/ operations: resource", () => {
  test.for([
    {
      given: ["resource-ready"] as const,
      outcome: "resource-ready",
    },
  ])("settles its future with the provided value", async ({ given: [resourceValue], outcome }) => {
    const settled = createScope().run(function* awaitProvidedResource() {
      const providedResource = yield* resource<string>(function* provideResource(provide) {
        yield* provide(resourceValue);
      });

      return yield* wait(providedResource);
    });

    await expect(settled).resolves.toBe(outcome);
  });

  test.for([
    {
      given: ["provided", "cleanup", "resource-ready"] as const,
      outcome: {
        events: ["provided", "cleanup"],
        value: "resource-ready",
      },
    },
  ])(
    "releases the provider during normal owner-scope convergence",
    async ({ given: [providedEntry, cleanupEntry, resourceValue], outcome }) => {
      const events: string[] = [];

      const settled = createScope().run(function* completeAfterResource() {
        const scopedResource = yield* resource<string>(function* provideScopedResource(provide) {
          try {
            events.push(providedEntry);
            yield* provide(resourceValue);
          } finally {
            events.push(cleanupEntry);
          }
        });

        return yield* wait(scopedResource);
      });

      await expect(settled).resolves.toBe(outcome.value);
      expect(events).toEqual(outcome.events);
    },
  );

  test.for([
    {
      given: ["provided", "cleanup", "resource-ready"] as const,
      outcome: {
        events: ["provided", "cleanup"],
        value: "resource-ready",
      },
    },
  ])(
    "releases the provider during owner-scope cancellation",
    async ({ given: [providedEntry, cleanupEntry, resourceValue], outcome }) => {
      const events: string[] = [];
      const scope = createScope();
      const captured = Promise.withResolvers<string>();

      try {
        const settled = scope.run(function* keepScopeOpenAfterResource() {
          const scopedResource = yield* resource<string>(function* provideScopedResource(provide) {
            try {
              events.push(providedEntry);
              yield* provide(resourceValue);
            } finally {
              events.push(cleanupEntry);
            }
          });

          const value = yield* wait(scopedResource);
          captured.resolve(value);
          yield* waitForCancellation();
        });

        await expect(captured.promise).resolves.toBe(outcome.value);
        const settledCancellation = expect(settled).rejects.toBeInstanceOf(CanceledError);
        await expect(scope.cancel()).resolves.toBeUndefined();
        await settledCancellation;
        expect(events).toEqual(outcome.events);
      } finally {
        if (scope.status !== "closed") {
          await expect(scope.cancel()).resolves.toBeUndefined();
        }
      }
    },
  );
});

function* waitForCancellation() {
  const [pending] = yield* future<never>();
  return yield* wait(pending);
}
