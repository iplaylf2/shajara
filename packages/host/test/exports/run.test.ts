import { CanceledError, ScopeError, run, until } from "#/index";
import { describe, expect, test } from "vitest";

describe("/ operations: run", () => {
  test.for([
    {
      given: ["settled"] as const,
      outcome: {
        afterAwait: "closed",
        beforeAwait: "open",
      } as const,
    },
  ])(
    "returns a stateful promise that resolves with the ritual result",
    async ({ given: [value], outcome }) => {
      const settled = run(() => until(() => Promise.resolve(value)));

      expect(settled.status).toBe(outcome.beforeAwait);
      await expect(settled).resolves.toBe(value);
      expect(settled.status).toBe(outcome.afterAwait);
    },
  );

  test.for([
    {
      given: [] as const,
      outcome: {
        afterAbort: "closed",
        beforeAbort: "open",
      } as const,
    },
  ])("cancels the launched ritual when the abort signal fires", async ({ outcome }) => {
    const controller = new globalThis.AbortController();
    const settled = run(() => until(() => createPendingPromise()), {
      signal: controller.signal,
    });

    expect(settled.status).toBe(outcome.beforeAbort);
    controller.abort();
    await expect(settled).rejects.toBeInstanceOf(CanceledError);
    expect(settled.status).toBe(outcome.afterAbort);
  });

  test.for([
    {
      given: [new Error("routine-startup-failed")] as const,
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
    "surfaces routine startup exceptions as scope failures",
    async ({ given: [cause], outcome }) => {
      const settled = run((() => {
        throw cause;
      }) as never);

      const actual = await Promise.resolve(settled).catch((error: unknown) => error);

      expect(actual).toBeInstanceOf(ScopeError);
      expect(actual).toMatchObject({
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

  test.for([
    {
      given: [] as const,
      outcome: "closed",
    },
  ])(
    "cancels immediately when the abort signal is already aborted before launch",
    async ({ outcome }) => {
      const controller = new globalThis.AbortController();
      controller.abort();

      const settled = run(() => until(() => createPendingPromise()), {
        signal: controller.signal,
      });

      await expect(settled).rejects.toBeInstanceOf(CanceledError);
      expect(settled.status).toBe(outcome);
    },
  );
});

function createPendingPromise(): Promise<never> {
  return new Promise<never>(() => {
    // Keep the promise pending until the ritual is canceled.
  });
}
