import { CanceledError, ScopeError, run, until } from "#/index";
import { describe, expect, test } from "vitest";
import { createPendingPromise } from "#test/harness";

describe("/ entries: run", () => {
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
      given: [new CanceledError()] as const,
    },
    {
      given: [null] as const,
    },
  ])(
    "cancels the launched ritual when the abort reason is cancellation-like",
    async ({ given: [reason] }) => {
      const controller = new globalThis.AbortController();
      const settled = run(() => until(() => createPendingPromise()), {
        signal: controller.signal,
      });

      controller.abort(reason);

      await expect(settled).rejects.toBeInstanceOf(CanceledError);
    },
  );

  test.for([
    {
      given: [new Error("abort-failed")] as const,
      outcome: {
        cause: {
          kind: "external",
        },
        kind: "scope",
      } as const,
    },
  ])(
    "halts the launched ritual when the abort reason is non-cancellation failure",
    async ({ given: [cause], outcome }) => {
      const controller = new globalThis.AbortController();
      const settled = run(() => until(() => createPendingPromise()), {
        signal: controller.signal,
      });

      controller.abort(cause);

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
      given: [new Error("routine-startup-failed")] as const,
      outcome: {
        cause: {
          kind: "external",
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

  test.for([
    {
      given: [new Error("abort-before-launch-failed")] as const,
      outcome: {
        cause: {
          kind: "external",
        },
        kind: "scope",
        status: "closed",
      } as const,
    },
  ])(
    "halts immediately when the abort signal already carries a non-cancellation failure",
    async ({ given: [cause], outcome }) => {
      const controller = new globalThis.AbortController();
      controller.abort(cause);

      const settled = run(() => until(() => createPendingPromise()), {
        signal: controller.signal,
      });

      await expect(settled).rejects.toBeInstanceOf(ScopeError);
      await expect(settled).rejects.toMatchObject({
        cause: {
          ...outcome.cause,
          raw: cause,
        },
        kind: outcome.kind,
      });
      expect(settled.status).toBe(outcome.status);
    },
  );
});
