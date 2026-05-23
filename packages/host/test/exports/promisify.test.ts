import {
  ScopeError,
  UnfulfilledError,
  completer,
  createScope,
  promisify,
  run,
  until,
} from "#/index";
import { describe, expect, test } from "vitest";
import { future } from "#/primitives";

describe("/ operations: promisify", () => {
  test.for([
    {
      given: ["settled"] as const,
      outcome: "settled",
    },
  ])(
    "returns a promise that resolves from the observed future",
    async ({ given: [value], outcome }) => {
      const settled = run(function* settled() {
        const { future: completed, resolve } = yield* completer<string>();
        const observed = yield* promisify(completed);

        globalThis.queueMicrotask(() => {
          resolve(value);
        });

        return yield* until(() => observed);
      });

      await expect(settled).resolves.toBe(outcome);
    },
  );

  test.for([
    {
      given: [new Error("promisify-failed")] as const,
      outcome: {
        cause: {
          kind: "external",
        },
        kind: "scope",
      } as const,
    },
  ])(
    "returns a promise that rejects from the observed future failure",
    async ({ given: [cause], outcome }) => {
      const settled = run(function* settled() {
        const { future: failed, reject } = yield* completer<never>();
        const observed = yield* promisify(failed);

        globalThis.queueMicrotask(() => {
          reject(cause);
        });

        return yield* until(() => observed);
      });

      await expect(settled).rejects.toBeInstanceOf(ScopeError);
      await expect(settled).rejects.toMatchObject({
        ...outcome,
        cause: {
          ...outcome.cause,
          raw: cause,
        },
      });
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
    "rejects when owner-scope convergence leaves the observed future unfulfilled",
    async ({ outcome }) => {
      const observed: Promise<never>[] = [];

      await expect(
        createScope().run(function* exposePendingFuture() {
          const [pending] = yield* future<never>();
          observed.push(yield* promisify(pending));
        }),
      ).resolves.toBeUndefined();

      await expect(observed[0]).rejects.toBeInstanceOf(outcome.error);
      await expect(observed[0]).rejects.toMatchObject({
        kind: outcome.kind,
        message: outcome.message,
      });
    },
  );
});
