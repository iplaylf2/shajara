import type { ECHO_TOKEN, KEY_TOKEN, SigilShape } from "#/contracts";
import type { ArrayValues } from "type-fest";

/**
 * Models channel allocation.
 *
 * @param capacity - Channel buffer capacity.
 * @param overloadRewrite - Overload policy for finite buffers.
 * @returns Channel instruction.
 */
export function channel<Value, Outcome>(
  capacity: number,
  overloadRewrite: OverloadRewrite<Value> = defaultOverloadRewrite,
): ChannelSigil<Value, Outcome> {
  return {
    capacity,
    kind: "channel",
    overloadRewrite,
  };
}

/**
 * Preserves normal blocking behavior on overload.
 *
 * @param buffer - Current buffer.
 * @param _incoming - Incoming value.
 * @returns Existing buffer.
 */
export function defaultOverloadRewrite<Value>(
  buffer: readonly Value[],
  _incoming: Value,
): readonly Value[] {
  return buffer;
}

/**
 * Policy applied before accepting an overloaded send.
 *
 * @param buffer - Current buffer.
 * @param incoming - Candidate value.
 * @returns Replacement buffer.
 */
export type OverloadRewrite<Value> = (
  buffer: readonly Value[],
  incoming: Value,
) => readonly Value[];

/** Channel allocation sigil shape. */
export interface ChannelSigil<Value, Outcome> extends SigilShape {
  readonly kind: "channel";
  readonly capacity: number;
  readonly overloadRewrite: OverloadRewrite<Value>;
  readonly [ECHO_TOKEN]?: readonly [ChannelHandle<Value, Outcome>];
}

/** Paired receiver and sender endpoints for a channel. */
export type ChannelHandle<Value, Outcome> = readonly [
  receiver: ChannelReceiver<Value, Outcome>,
  sender: ChannelSender<Value, Outcome>,
];

/** Either endpoint of a channel. */
export type ChannelEndpoint<Value, Outcome> = ArrayValues<ChannelHandle<Value, Outcome>>;

/** Read endpoint accepted by receive operations. */
export interface ChannelReceiver<Value, Outcome> {
  readonly [KEY_TOKEN]: "channel-receiver";
  readonly [TYPE_TOKEN]?: readonly [Value, Outcome];
}

/** Write endpoint accepted by send operations. */
export interface ChannelSender<Value, Outcome> {
  readonly [KEY_TOKEN]: "channel-sender";
  readonly [TYPE_TOKEN]?: readonly [Value, Outcome];
}

declare const TYPE_TOKEN: unique symbol;
