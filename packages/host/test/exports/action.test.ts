import { ScopeError, action, run } from "#/index";
import { describe, expect, test } from "vitest";
import { wait } from "#/primitives";

describe("/ operations: action", () => {
  test.for([
    {
      given: ["settled"] as const,
      outcome: "settled",
    },
  ])(
    "returns a future whose resolution settles from host callbacks",
    async ({ given: [value], outcome }) => {
      const settled = run(function* settled() {
        const { future, resolve } = yield* action<string>();

        globalThis.queueMicrotask(() => {
          resolve(value);
        });

        return yield* wait(future);
      });

      await expect(settled).resolves.toBe(outcome);
    },
  );

  test.for([
    {
      given: [new Error("action-failed")] as const,
      outcome: {
        cause: {
          failure: {
            kind: "external",
          },
          kind: "process",
        },
        kind: "scope",
      } as const,
    },
  ])(
    "propagates the original error instance when the host rejects the action",
    async ({ given: [cause], outcome }) => {
      const settled = run(function* settled() {
        const { future, reject } = yield* action<never>();

        globalThis.queueMicrotask(() => {
          reject(cause);
        });

        return yield* wait(future);
      });

      await expect(settled).rejects.toBeInstanceOf(ScopeError);
      await expect(settled).rejects.toMatchObject({
        ...outcome,
        cause: {
          ...outcome.cause,
          failure: {
            ...outcome.cause.failure,
            raw: cause,
          },
        },
      });
    },
  );
});
