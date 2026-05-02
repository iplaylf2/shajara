import { CanceledError, createScope } from "#/index";
import { describe, expect, test } from "vitest";
import { future, resource, wait } from "#/primitives";

describe("/ primitives: resource", () => {
  test.for([
    {
      given: ["resource-ready"] as const,
      outcome: "resource-ready",
    },
  ])(
    "settles its future when the provider exposes a value",
    async ({ given: [resourceValue], outcome }) => {
      const scope = createScope();
      const captured = Promise.withResolvers<string>();

      try {
        const settled = scope.run(function* awaitProvidedResource() {
          const providedResource = yield* resource<string>(function* provideResource(provide) {
            yield* provide(resourceValue);
          });

          const value = yield* wait(providedResource);
          captured.resolve(value);
          yield* waitForCancellation();
        });

        await expect(captured.promise).resolves.toBe(outcome);
        await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
        await expect(settled).rejects.toBeInstanceOf(CanceledError);
      } finally {
        if (scope.status !== "closed") {
          await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
        }
      }
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
    "remains attached to the scope until cancellation unwinds the provider finally block",
    async ({ given: [providedEntry, cleanupEntry, resourceValue], outcome }) => {
      const events: string[] = [];
      const scope = createScope();
      const captured = Promise.withResolvers<string>();

      try {
        const settled = scope.run(function* manageScopedResource() {
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
        await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
        await expect(settled).rejects.toBeInstanceOf(CanceledError);
        expect(events).toEqual(outcome.events);
      } finally {
        if (scope.status !== "closed") {
          await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
        }
      }
    },
  );
});

function* waitForCancellation() {
  const [pending] = yield* future<never>();
  return yield* wait(pending);
}
