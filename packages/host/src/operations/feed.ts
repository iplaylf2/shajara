import type { ChannelReceiver, OverloadRewrite } from "#/primitives/index.js";
import type { RiteCoroutine } from "#/contracts/index.js";
import { channel } from "#/primitives/index.js";
import { channelErrorOf } from "#/primitives-kit/index.js";
import { currentExecutor } from "#/operations-kit/index.js";
import { isNone } from "@shajara/kernel/utils";

/**
 * Creates a channel receiver with producer controls.
 *
 * @param capacity - `0` creates rendezvous delivery, finite positives create bounded
 * buffering, and `Infinity` creates unbounded buffering.
 * @param overloadRewrite - Finite-buffer policy applied before an overloaded send is accepted.
 * @returns Receiver plus producer controls.
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
  /** Receiver consumed by routines. */
  readonly receiver: ChannelReceiver<Value, Outcome>;

  /**
   * Attempts to send a value without waiting.
   *
   * @returns `true` when sent, or `false` when the send would block.
   * @throws `ChannelError` when the channel is closed or revoked.
   */
  trySend(value: Value): boolean;

  /**
   * Closes the channel for receivers.
   *
   * @param outcome - Close outcome observed by receivers.
   */
  close(outcome: Outcome): void;
}
