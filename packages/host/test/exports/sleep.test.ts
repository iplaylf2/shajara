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
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const capturedTimer: { fire: (() => void) | null } = { fire: null };
      const timeoutToken = Symbol("timeout");

      try {
        setTimeoutSpy.mockImplementation(((handler: TimerHandler) => {
          capturedTimer.fire = () => {
            if (typeof handler === "function") {
              handler();
            }
          };

          return timeoutToken as unknown as ReturnType<typeof globalThis.setTimeout>;
        }) as typeof globalThis.setTimeout);

        const settled = run(() => sleep(milliseconds));
        await waitForPostedTasks();

        expect(settled.status).toBe(outcome.statusBeforeDelay);
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), milliseconds);

        const fireTimer = capturedTimer.fire;
        expect(fireTimer).not.toBeNull();
        if (fireTimer === null) {
          throw new Error("Expected sleep() to register a timeout callback.");
        }

        fireTimer();
        await expect(settled).resolves.toBeUndefined();
        expect(settled.status).toBe(outcome.statusAfterDelay);
        expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutToken);
      } finally {
        setTimeoutSpy.mockRestore();
        clearTimeoutSpy.mockRestore();
      }
    },
  );
});

function waitForPostedTasks(): Promise<void> {
  return new Promise<void>((resolve) => {
    const channel = new globalThis.MessageChannel();
    channel.port1.onmessage = () => {
      resolve();
    };
    channel.port2.postMessage(null);
  });
}
