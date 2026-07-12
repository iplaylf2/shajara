import { CanceledError, ScopeError, run, until } from "#/index";
import { describe, expect, test, vi } from "vitest";
import { createPendingPromise } from "#test/harness";

describe("/ entries: run", () => {
  test.for([
    {
      given: ["first", "second", "next"] as const,
      outcome: {
        closeCalls: [0, PORT_COUNT, PORT_COUNT * 2],
        results: ["first", "second", "next"],
      },
    },
  ])(
    "retains scheduler resources until all top-level runs settle",
    async ({ given: [firstValue, secondValue, nextValue], outcome }) => {
      const channel = new globalThis.MessageChannel();
      const portPrototype = Object.getPrototypeOf(channel.port1) as MessagePort;
      const closeSpy = vi.spyOn(portPrototype, "close");
      channel.port1.close();
      channel.port2.close();
      closeSpy.mockClear();

      try {
        const first = Promise.withResolvers<string>();
        const second = Promise.withResolvers<string>();
        const firstRun = run(() => until(() => first.promise));
        const secondRun = run(() => until(() => second.promise));

        first.resolve(firstValue);
        const firstResult = await firstRun;
        const closeCalls = [closeSpy.mock.calls.length];

        second.resolve(secondValue);
        const secondResult = await secondRun;
        closeCalls.push(closeSpy.mock.calls.length);

        const nextResult = await run(() => until(() => Promise.resolve(nextValue)));
        closeCalls.push(closeSpy.mock.calls.length);

        expect({ closeCalls, results: [firstResult, secondResult, nextResult] }).toEqual(outcome);
      } finally {
        vi.restoreAllMocks();
      }
    },
  );

  test.for([
    {
      given: ["settled"] as const,
      outcome: {
        afterAwait: "closed",
        beforeAwait: "open",
      } as const,
    },
  ])(
    "returns a stateful promise that resolves with the routine result",
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
  ])("cancels the launched routine when the abort signal fires", async ({ outcome }) => {
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
    "cancels the launched routine when the abort reason is cancellation-like",
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
    "halts the launched routine when the abort reason is non-cancellation failure",
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

const PORT_COUNT = 2;
