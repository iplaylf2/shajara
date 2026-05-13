import type { ChannelReceiver, OverloadRewrite } from "#/primitives/index";
import type { RiteCoroutine } from "#/contracts";
import { channel } from "#/primitives/index";
import { channelErrorOf } from "#/primitives-kit";
import { currentExecutor } from "#/operations-kit";
import { isNone } from "@shajara/kernel/utils";

/**
 * Creates a channel receiver plus immediate producer callbacks.
 *
 * @param capacity - `0` creates rendezvous delivery, finite positives create bounded
 * buffering, and `Infinity` creates unbounded buffering.
 * @param overloadRewrite - Finite-buffer policy applied before an overloaded send is accepted.
 * @returns Receiver for coroutine consumers and callbacks for external producers.
 * @throws `ChannelError` when `capacity` is negative or `NaN`.
 */
export function* feed<Value, Outcome>(
  capacity: number,
  overloadRewrite?: OverloadRewrite<Value>,
): RiteCoroutine<Feed<Value, Outcome>> {
  const executor = yield* currentExecutor();
  const [receiver, sender] = yield* channel<Value, Outcome>(capacity, overloadRewrite);

  return {
    close(outcome) {
      executor.close(sender, outcome);
    },
    receiver,
    trySend(value) {
      const result = executor.trySend(sender, value);

      if (isNone(result)) {
        return false;
      }

      switch (result.value.kind) {
        case "sent": {
          return true;
        }
        case "closed":
        case "revoked": {
          throw channelErrorOf(result.value);
        }
      }
    },
  };
}

/** Producer controls paired with a channel receiver. */
export interface Feed<Value, Outcome> {
  /** Receiver consumed by channel primitives. */
  readonly receiver: ChannelReceiver<Value, Outcome>;

  /**
   * Attempts to send a value immediately from outside the coroutine.
   *
   * @returns `true` when sent, or `false` when the send would block.
   * @throws `ChannelError` when the channel is closed or revoked.
   */
  trySend(value: Value): boolean;

  /**
   * Closes the channel through the producer callback.
   *
   * @param outcome - Close outcome observed by receivers.
   */
  close(outcome: Outcome): void;
}
