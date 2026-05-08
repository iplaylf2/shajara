import { ScopeError, completer, run } from "#/index";
import { describe, expect, test } from "vitest";
import { wait } from "#/primitives";

describe("/ operations: completer", () => {
  test.for([
    {
      given: ["settled"] as const,
      outcome: "settled",
    },
  ])(
    "returns a future whose resolution settles from host callbacks",
    async ({ given: [value], outcome }) => {
      const settled = run(function* settled() {
        const { future: completedResult, resolve } = yield* completer<string>();

        globalThis.queueMicrotask(() => {
          resolve(value);
        });

        return yield* wait(completedResult);
      });

      await expect(settled).resolves.toBe(outcome);
    },
  );

  test.for([
    {
      given: [new Error("completer-failed")] as const,
      outcome: {
        cause: {
          kind: "external",
        },
        kind: "scope",
      } as const,
    },
  ])(
    "propagates the original error instance when the host rejects the completer",
    async ({ given: [cause], outcome }) => {
      const settled = run(function* settled() {
        const { future: rejectedResult, reject } = yield* completer<never>();

        globalThis.queueMicrotask(() => {
          reject(cause);
        });

        return yield* wait(rejectedResult);
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
});
