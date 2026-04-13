import { describe, expect, test, vi } from "vitest";
import { run, sleep } from "#/index";

describe("/ operations: sleep", () => {
  test.for([
    {
      given: [25] as const,
      outcome: {
        statusAfterDelay: "closed",
        statusBeforeDelay: "open",
      } as const,
    },
  ])(
    "settles only after the requested timeout elapses",
    async ({ given: [milliseconds], outcome }) => {
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

      try {
        const settled = run(() => sleep(milliseconds));
        await flushPostedTasks();

        expect(settled.status).toBe(outcome.statusBeforeDelay);
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), milliseconds);

        await vi.advanceTimersByTimeAsync(milliseconds - 1);
        expect(settled.status).toBe(outcome.statusBeforeDelay);

        await vi.advanceTimersByTimeAsync(1);
        await vi.runOnlyPendingTimersAsync();
        await flushPostedTasks();
        await expect(settled).resolves.toBeUndefined();
        expect(settled.status).toBe(outcome.statusAfterDelay);
        expect(clearTimeoutSpy).toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
        setTimeoutSpy.mockRestore();
        clearTimeoutSpy.mockRestore();
      }
    },
  );
});

function flushPostedTasks(): Promise<void> {
  return new Promise<void>((resolve) => {
    const channel = new globalThis.MessageChannel();
    channel.port1.onmessage = () => {
      resolve();
    };
    channel.port2.postMessage(null);
  });
}
