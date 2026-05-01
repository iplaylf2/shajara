import { ChannelError, run } from "#/index";
import { branch, channel, close, receive, send, tryReceive, trySend } from "#/primitives";
import { describe, expect, test } from "vitest";

describe("/ primitives: channel, close, send, receive, trySend, tryReceive", () => {
  test.for([
    {
      given: [1, "buffered-value", "closed-outcome"] as const,
      outcome: {
        closeResult: undefined,
        receiveResult: "buffered-value",
        sendResult: undefined,
      },
    },
  ])(
    "returns values for successful channel operations",
    async ({ given: [capacity, value, closeOutcome], outcome }) => {
      const settled = run(function* useBufferedChannel() {
        const [receiver, sender] = yield* channel<string, string>(capacity);

        const sendResult = yield* send(sender, value);
        const receiveResult = yield* receive(receiver);
        const closeResult = yield* close(sender, closeOutcome);

        return { closeResult, receiveResult, sendResult };
      });

      await expect(settled).resolves.toEqual(outcome);
    },
  );

  test.for([
    {
      given: [1, "buffered-value", "incoming-value"] as const,
      outcome: {
        rewriteCalls: 1,
        sendResult: true,
      },
    },
  ])(
    "accepts an overload rewrite policy for channel creation",
    async ({ given: [capacity, bufferedValue, incomingValue], outcome }) => {
      const settled = run(function* useChannelWithOverloadRewrite() {
        let rewriteCalls = 0;
        const [, sender] = yield* channel<string, string>(capacity, () => {
          rewriteCalls += 1;
          return [];
        });

        yield* send(sender, bufferedValue);

        const sendResult = yield* trySend(sender, incomingValue);

        return { rewriteCalls, sendResult };
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
        detail: {
          cause: {
            capacity: -1,
            kind: "invalid-capacity",
          },
          kind: "cause",
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
        detail: {
          cause: {
            capacity: Number.NaN,
            kind: "invalid-capacity",
          },
          kind: "cause",
        },
        kind: "channel",
        message: "Channel capacity must be a non-negative number: NaN",
      },
    },
  ])("throws ChannelError for invalid capacity", async ({ given: [capacity], outcome }) => {
    const settled = run(function* catchInvalidCapacity() {
      try {
        yield* channel<string, string>(capacity);
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
      given: [1, "late-value", "closed-outcome"] as const,
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
      },
    },
  ])(
    "throws ChannelError when sending to a closed channel",
    async ({ given: [capacity, value, closeOutcome], outcome }) => {
      const settled = run(function* catchClosedSend() {
        const [, sender] = yield* channel<string, string>(capacity);

        yield* close(sender, closeOutcome);

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
        cause: null,
        detail: {
          condition: {
            kind: "revoked",
          },
          kind: "condition",
        },
        kind: "channel",
        message: "Channel is revoked",
      },
    },
  ])("throws ChannelError when receiving from a revoked channel", async ({ outcome }) => {
    const settled = run(function* catchRevokedReceive() {
      const receiver = yield* branch(function* createOwnedReceiver() {
        const [ownedReceiver] = yield* channel<string, string>(0);
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

  test.for([
    {
      given: [1, "buffered-value", "full-value"] as const,
      outcome: {
        emptyReceiveResult: [false],
        firstSendResult: true,
        fullSendResult: false,
        valueReceiveResult: [true, "buffered-value"],
      },
    },
  ])(
    "returns non-blocking channel operation states",
    async ({ given: [capacity, value, fullValue], outcome }) => {
      const settled = run(function* useNonBlockingChannelOperations() {
        const [receiver, sender] = yield* channel<string, string>(capacity);

        const emptyReceiveResult = yield* tryReceive(receiver);
        const firstSendResult = yield* trySend(sender, value);
        const fullSendResult = yield* trySend(sender, fullValue);
        const valueReceiveResult = yield* tryReceive(receiver);

        return {
          emptyReceiveResult,
          firstSendResult,
          fullSendResult,
          valueReceiveResult,
        };
      });

      await expect(settled).resolves.toEqual(outcome);
    },
  );

  test.for([
    {
      given: [1, "late-value", "closed-outcome"] as const,
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
      },
    },
  ])(
    "throws ChannelError when trySending to a closed channel",
    async ({ given: [capacity, value, closeOutcome], outcome }) => {
      const settled = run(function* catchClosedTrySend() {
        const [, sender] = yield* channel<string, string>(capacity);

        yield* close(sender, closeOutcome);

        try {
          yield* trySend(sender, value);
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
      given: [1, "closed-outcome"] as const,
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
      },
    },
  ])(
    "throws ChannelError when tryReceiving from a closed channel",
    async ({ given: [capacity, closeOutcome], outcome }) => {
      const settled = run(function* catchClosedTryReceive() {
        const [receiver, sender] = yield* channel<string, string>(capacity);

        yield* close(sender, closeOutcome);

        try {
          yield* tryReceive(receiver);
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
