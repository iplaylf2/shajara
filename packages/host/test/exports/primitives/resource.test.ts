import { CanceledError, createScope } from "#/index";
import { defer, park, resource, wait } from "#/primitives";
import { describe, expect, test } from "vitest";

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
          const resourceFuture = yield* resource<string>(function* provideResource(provide) {
            yield* provide(resourceValue);
          });

          const value = yield* wait(resourceFuture);
          captured.resolve(value);
          yield* park();
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
      outcome: ["provided", "cleanup"],
    },
  ])(
    "remains attached to the scope until cancellation triggers deferred cleanup",
    async ({ given: [providedEntry, cleanupEntry, resourceValue], outcome }) => {
      const events: string[] = [];
      const scope = createScope();
      const captured = Promise.withResolvers<string>();

      try {
        const settled = scope.run(function* manageScopedResource() {
          const resourceFuture = yield* resource<string>(function* provideScopedResource(provide) {
            yield* defer(function* cleanupResource() {
              events.push(cleanupEntry);
            });
            events.push(providedEntry);
            yield* provide(resourceValue);
          });

          const value = yield* wait(resourceFuture);
          captured.resolve(value);
          yield* park();
        });

        await expect(captured.promise).resolves.toBe(resourceValue);
        await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
        await expect(settled).rejects.toBeInstanceOf(CanceledError);
        expect(events).toEqual(outcome);
      } finally {
        if (scope.status !== "closed") {
          await expect(scope.cancel()).rejects.toBeInstanceOf(CanceledError);
        }
      }
    },
  );
});
