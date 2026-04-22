import { cede, channel, close, receive, send, spawn, tryReceive, trySend, wait } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapExitedSucceeded } from "#test/harness";
import { left, none, right, some } from "#/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: channel, close, send, receive", () => {
  test.for([
    {
      given: [1, "buffered-value"] as const,
      outcome: { kind: "value", value: "buffered-value" },
    },
    {
      given: [Infinity, "unbounded-value"] as const,
      outcome: { kind: "value", value: "unbounded-value" },
    },
  ])(
    "sends and receives through a buffered channel",
    async ({ given: [capacity, value], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          channel<string>(capacity),
          wisp.chainFirst(([, sender]) => send(sender, value)),
          wisp.chain(([receiver]) => receive(receiver)),
        ),
      );
      const step = ritual.driveSync();
      const actual = unwrapExitedSucceeded(step);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [0, "rendezvous-value"] as const,
      outcome: { kind: "value", value: "rendezvous-value" },
    },
  ])(
    "synchronizes send and receive through a rendezvous channel",
    async ({ given: [capacity, value], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          channel<string>(capacity),
          wisp.chainFirst(([, sender]) => spawn(() => send(sender, value))),
          wisp.chain(([receiver]) => receive(receiver)),
        ),
      );
      const step = await ritual.waitForClosed();
      const actual = unwrapExitedSucceeded(step);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [0, "waiting-sender-value"] as const,
      outcome: {
        receiveResult: { kind: "value", value: "waiting-sender-value" },
        sendResult: right({ kind: "sent" }),
      },
    },
  ])(
    "receives from a sender that was already waiting on a rendezvous channel",
    async ({ given: [capacity, value], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          channel<string>(capacity),
          wisp.map(([receiver, sender]) => ({ receiver, sender })),
          wisp.bind("sendFuture", ({ sender }) => spawn(() => send(sender, value))),
          wisp.chainFirst(() => cede()),
          wisp.bind("receiveResult", ({ receiver }) => receive(receiver)),
          wisp.bind("sendResult", ({ sendFuture }) => wait(sendFuture)),
          wisp.map(({ receiveResult, sendResult }) => ({ receiveResult, sendResult })),
        ),
      );
      const step = await ritual.waitForClosed();
      const actual = unwrapExitedSucceeded(step);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [1, "buffered-first", "waiting-second"] as const,
      outcome: {
        firstReceiveResult: { kind: "value", value: "buffered-first" },
        secondReceiveResult: { kind: "value", value: "waiting-second" },
        secondSendResult: right({ kind: "sent" }),
      },
    },
  ])(
    "backfills bounded channel capacity from waiting senders after a receive",
    async ({ given: [capacity, firstValue, secondValue], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          channel<string>(capacity),
          wisp.map(([receiver, sender]) => ({ receiver, sender })),
          wisp.chainFirst(({ sender }) => send(sender, firstValue)),
          wisp.bind("secondSendFuture", ({ sender }) => spawn(() => send(sender, secondValue))),
          wisp.chainFirst(() => cede()),
          wisp.bind("firstReceiveResult", ({ receiver }) => receive(receiver)),
          wisp.bind("secondSendResult", ({ secondSendFuture }) => wait(secondSendFuture)),
          wisp.bind("secondReceiveResult", ({ receiver }) => receive(receiver)),
          wisp.map(({ firstReceiveResult, secondReceiveResult, secondSendResult }) => ({
            firstReceiveResult,
            secondReceiveResult,
            secondSendResult,
          })),
        ),
      );
      const step = await ritual.waitForClosed();
      const actual = unwrapExitedSucceeded(step);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [1, "late-value"] as const,
      outcome: {
        receiveResult: { kind: "closed" },
        sendResult: { kind: "closed" },
      },
    },
  ])(
    "returns terminal channel results after close",
    async ({ given: [capacity, value], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          channel<string>(capacity),
          wisp.map(([receiver, sender]) => ({ receiver, sender })),
          wisp.chainFirst(({ sender }) => close(sender)),
          wisp.chainFirst(({ sender }) => close(sender)),
          wisp.bind("receiveResult", ({ receiver }) => receive(receiver)),
          wisp.bind("sendResult", ({ sender }) => send(sender, value)),
          wisp.map(({ receiveResult, sendResult }) => ({ receiveResult, sendResult })),
        ),
      );
      const step = ritual.driveSync();
      const actual = unwrapExitedSucceeded(step);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [1, "try-value"] as const,
      outcome: {
        emptyReceiveResult: none,
        firstSendResult: some({ kind: "sent" }),
        fullSendResult: none,
        valueReceiveResult: some({ kind: "value", value: "try-value" }),
      },
    },
  ])(
    "returns option states for non-blocking channel operations",
    async ({ given: [capacity, value], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          channel<string>(capacity),
          wisp.map(([receiver, sender]) => ({ receiver, sender })),
          wisp.bind("emptyReceiveResult", ({ receiver }) => tryReceive(receiver)),
          wisp.bind("firstSendResult", ({ sender }) => trySend(sender, value)),
          wisp.bind("fullSendResult", ({ sender }) => trySend(sender, "full-value")),
          wisp.bind("valueReceiveResult", ({ receiver }) => tryReceive(receiver)),
          wisp.map(
            ({ emptyReceiveResult, firstSendResult, fullSendResult, valueReceiveResult }) => ({
              emptyReceiveResult,
              firstSendResult,
              fullSendResult,
              valueReceiveResult,
            }),
          ),
        ),
      );
      const step = ritual.driveSync();
      const actual = unwrapExitedSucceeded(step);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [1, "old-value", "incoming-value"] as const,
      outcome: {
        receiveResult: { kind: "value", value: "incoming-value" },
        sendResult: some({ kind: "sent" }),
      },
    },
  ])(
    "accepts an overloaded send after the channel rewrite frees capacity",
    async ({ given: [capacity, oldValue, incomingValue], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          channel<string>(capacity, () => []),
          wisp.map(([receiver, sender]) => ({ receiver, sender })),
          wisp.chainFirst(({ sender }) => send(sender, oldValue)),
          wisp.bind("sendResult", ({ sender }) => trySend(sender, incomingValue)),
          wisp.bind("receiveResult", ({ receiver }) => receive(receiver)),
          wisp.map(({ receiveResult, sendResult }) => ({ receiveResult, sendResult })),
        ),
      );
      const step = ritual.driveSync();
      const actual = unwrapExitedSucceeded(step);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [1, "old-value", "waiting-value", "incoming-value"] as const,
      outcome: {
        incomingSendResult: none,
        receiveResult: { kind: "value", value: "waiting-value" },
        waitingSendResult: right({ kind: "sent" }),
      },
    },
  ])(
    "backfills waiting senders before accepting an overloaded incoming value",
    async ({ given: [capacity, oldValue, waitingValue, incomingValue], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          channel<string>(capacity, (buffer) => buffer.filter((value) => value !== oldValue)),
          wisp.map(([receiver, sender]) => ({ receiver, sender })),
          wisp.chainFirst(({ sender }) => send(sender, oldValue)),
          wisp.bind("waitingSendFuture", ({ sender }) => spawn(() => send(sender, waitingValue))),
          wisp.chainFirst(() => cede()),
          wisp.bind("incomingSendResult", ({ sender }) => trySend(sender, incomingValue)),
          wisp.bind("waitingSendResult", ({ waitingSendFuture }) => wait(waitingSendFuture)),
          wisp.bind("receiveResult", ({ receiver }) => receive(receiver)),
          wisp.map(({ incomingSendResult, receiveResult, waitingSendResult }) => ({
            incomingSendResult,
            receiveResult,
            waitingSendResult,
          })),
        ),
      );
      const step = await ritual.waitForClosed();
      const actual = unwrapExitedSucceeded(step);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [1, "closed-value"] as const,
      outcome: {
        receiveResult: some({ kind: "closed" }),
        sendResult: some({ kind: "closed" }),
      },
    },
  ])(
    "returns terminal channel states through non-blocking operations",
    async ({ given: [capacity, value], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          channel<string>(capacity),
          wisp.map(([receiver, sender]) => ({ receiver, sender })),
          wisp.chainFirst(({ sender }) => close(sender)),
          wisp.bind("receiveResult", ({ receiver }) => tryReceive(receiver)),
          wisp.bind("sendResult", ({ sender }) => trySend(sender, value)),
          wisp.map(({ receiveResult, sendResult }) => ({ receiveResult, sendResult })),
        ),
      );
      const step = ritual.driveSync();
      const actual = unwrapExitedSucceeded(step);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [0] as const,
      outcome: right({ kind: "closed" }),
    },
  ])("wakes a waiting receiver when the channel closes", async ({ given: [capacity], outcome }) => {
    await using ritual = interpretRitual(() =>
      pipe(
        channel<string>(capacity),
        wisp.map(([receiver, sender]) => ({ receiver, sender })),
        wisp.bind("receiveFuture", ({ receiver }) => spawn(() => receive(receiver))),
        wisp.chainFirst(() => cede()),
        wisp.chainFirst(({ sender }) => close(sender)),
        wisp.chain(({ receiveFuture }) => wait(receiveFuture)),
      ),
    );
    const step = await ritual.waitForClosed();
    const actual = unwrapExitedSucceeded(step);

    expect(actual).toEqual(outcome);
  });

  test.for([
    {
      given: [0, "blocked-send"] as const,
      outcome: right({ kind: "closed" }),
    },
  ])(
    "wakes a waiting sender when the channel closes",
    async ({ given: [capacity, value], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          channel<string>(capacity),
          wisp.map(([receiver, sender]) => ({ receiver, sender })),
          wisp.bind("sendFuture", ({ sender }) => spawn(() => send(sender, value))),
          wisp.chainFirst(() => cede()),
          wisp.chainFirst(({ receiver }) => close(receiver)),
          wisp.chain(({ sendFuture }) => wait(sendFuture)),
        ),
      );
      const step = await ritual.waitForClosed();
      const actual = unwrapExitedSucceeded(step);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [-1] as const,
      outcome: left({
        cause: {
          capacity: -1,
          kind: "invalid-capacity",
        },
        kind: "channel",
        message: "Channel capacity must be a non-negative number: -1",
      }),
    },
    {
      given: [Number.NaN] as const,
      outcome: left({
        cause: {
          capacity: Number.NaN,
          kind: "invalid-capacity",
        },
        kind: "channel",
        message: "Channel capacity must be a non-negative number: NaN",
      }),
    },
  ])("halts when channel capacity is not non-negative", async ({ given: [capacity], outcome }) => {
    await using ritual = interpretRitual(() => channel(capacity));
    const step = ritual.driveSync();
    const actual = unwrapExited(step);

    expect(actual).toEqual(outcome);
  });
});
