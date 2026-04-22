import { ChannelError, run } from "#/index";
import { channel, close, enclose, receive, send } from "#/primitives";
import { describe, expect, test } from "vitest";

describe("/ primitives: channel, close, send, receive", () => {
  test.for([
    {
      given: [1, "buffered-value"] as const,
      outcome: {
        closeResult: undefined,
        receiveResult: "buffered-value",
        sendResult: undefined,
      },
    },
  ])(
    "returns values for successful channel operations",
    async ({ given: [capacity, value], outcome }) => {
      const settled = run(function* useBufferedChannel() {
        const [receiver, sender] = yield* channel<string>(capacity);

        const sendResult = yield* send(sender, value);
        const receiveResult = yield* receive(receiver);
        const closeResult = yield* close(sender);

        return { closeResult, receiveResult, sendResult };
      });

      await expect(settled).resolves.toEqual(outcome);
    },
  );

  test.for([
    {
      given: [-1] as const,
      outcome: {
        cause: {
          capacity: -1,
          kind: "invalid-capacity",
        },
        kind: "channel",
        message: "Channel capacity must be a non-negative number: -1",
      },
    },
    {
      given: [Number.NaN] as const,
      outcome: {
        cause: {
          capacity: Number.NaN,
          kind: "invalid-capacity",
        },
        kind: "channel",
        message: "Channel capacity must be a non-negative number: NaN",
      },
    },
  ])("throws ChannelError for invalid capacity", async ({ given: [capacity], outcome }) => {
    const settled = run(function* catchInvalidCapacity() {
      try {
        yield* channel<string>(capacity);
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
      given: [1, "late-value"] as const,
      outcome: {
        cause: {
          kind: "closed",
        },
        kind: "channel",
        message: "Channel is closed",
      },
    },
  ])(
    "throws ChannelError when sending to a closed channel",
    async ({ given: [capacity, value], outcome }) => {
      const settled = run(function* catchClosedSend() {
        const [, sender] = yield* channel<string>(capacity);

        yield* close(sender);

        try {
          yield* send(sender, value);
        } catch (error) {
          return error;
        }

        return null;
      });

      await expect(settled).resolves.toBeInstanceOf(ChannelError);
      await expect(settled).resolves.toMatchObject(outcome);
    },
  );

  test.for([
    {
      given: [] as const,
      outcome: {
        cause: {
          kind: "revoked",
        },
        kind: "channel",
        message: "Channel is revoked",
      },
    },
  ])("throws ChannelError when receiving from a revoked channel", async ({ outcome }) => {
    const settled = run(function* catchRevokedReceive() {
      const receiver = yield* enclose(function* createOwnedReceiver() {
        const [ownedReceiver] = yield* channel<string>(0);
        return ownedReceiver;
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
});
