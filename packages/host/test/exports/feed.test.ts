import { ChannelError, feed, run } from "#/index";
import { describe, expect, test } from "vitest";
import { receive } from "#/primitives";

describe("/ operations: feed", () => {
  test.for([
    {
      given: ["fed-value"] as const,
      outcome: "fed-value",
    },
  ])(
    "returns a receiver whose values are sent from host callbacks",
    async ({ given: [value], outcome }) => {
      const settled = run(function* settled() {
        const { receiver, trySend } = yield* feed<string, never>(Infinity);

        globalThis.queueMicrotask(() => {
          trySend(value);
        });

        return yield* receive(receiver);
      });

      await expect(settled).resolves.toBe(outcome);
    },
  );

  test.for([
    {
      given: ["closed-outcome"] as const,
      outcome: {
        cause: null,
        detail: {
          condition: {
            kind: "closed",
            outcome: "closed-outcome",
          },
          kind: "condition",
        },
        kind: "channel",
        message: "Channel is closed",
      } as const,
    },
  ])("closes the receiver from host callbacks", async ({ given: [closeOutcome], outcome }) => {
    const settled = run(function* settled() {
      const { close, receiver } = yield* feed<never, string>(Infinity);

      globalThis.queueMicrotask(() => {
        close(closeOutcome);
      });

      try {
        yield* receive(receiver);
      } catch (error) {
        return error;
      }

      return null;
    });

    await expect(settled).resolves.toBeInstanceOf(ChannelError);
    await expect(settled).resolves.toMatchObject(outcome);
  });

  test.for([
    {
      given: ["closed-outcome", "late-value"] as const,
      outcome: {
        cause: null,
        detail: {
          condition: {
            kind: "closed",
            outcome: "closed-outcome",
          },
          kind: "condition",
        },
        kind: "channel",
        message: "Channel is closed",
      } as const,
    },
  ])(
    "throws ChannelError when host callbacks send after close",
    async ({ given: [closeOutcome, value], outcome }) => {
      const settled = run(function* settled() {
        const { close, trySend } = yield* feed<string, string>(Infinity);

        close(closeOutcome);

        try {
          trySend(value);
        } catch (error) {
          return error;
        }

        return null;
      });

      await expect(settled).resolves.toBeInstanceOf(ChannelError);
      await expect(settled).resolves.toMatchObject(outcome);
    },
  );
});
