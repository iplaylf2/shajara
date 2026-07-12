import type { ECHO_TOKEN, KEY_TOKEN, SigilShape } from "#/contracts/index.js";

/**
 * Creates a sigil that allocates a channel in the current scope.
 *
 * @param capacity - `0` creates rendezvous delivery, finite positives create bounded
 * buffering, and `Infinity` creates unbounded buffering.
 * @param overloadRewrite - Finite-buffer policy applied before an overloaded send is accepted.
 * @returns Channel-allocation sigil whose echo is the receiver and sender handle.
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
 * Preserves normal finite-buffer blocking behavior on overload.
 *
 * @returns Existing buffer.
 */
export function defaultOverloadRewrite<Value>(
  buffer: readonly Value[],
  _incoming: Value,
): readonly Value[] {
  return buffer;
}

/**
 * Rewrites a finite channel buffer before an overloaded incoming value is accepted.
 *
 * @returns Replacement buffer; the incoming value is accepted only when capacity remains.
 */
export type OverloadRewrite<Value> = (
  buffer: readonly Value[],
  incoming: Value,
) => readonly Value[];

/** Sigil that allocates a channel in the current scope. */
export interface ChannelSigil<Value, Outcome> extends SigilShape {
  readonly kind: "channel";
  readonly capacity: number;
  readonly overloadRewrite: OverloadRewrite<Value>;
  readonly [ECHO_TOKEN]?: readonly [ChannelHandle<Value, Outcome>];
}

/** Paired read and write endpoints for one channel. */
export type ChannelHandle<Value, Outcome> = readonly [
  receiver: ChannelReceiver<Value, Outcome>,
  sender: ChannelSender<Value, Outcome>,
];

/** Either read or write endpoint for one channel. */
export type ChannelEndpoint<Value, Outcome> = ChannelHandle<Value, Outcome>[number];

/** Read authority for channel receive operations. */
export interface ChannelReceiver<Value, Outcome> {
  readonly [KEY_TOKEN]: "channel-receiver";
  readonly [TYPE_TOKEN]?: readonly [Value, Outcome];
}

/** Write authority for channel send operations. */
export interface ChannelSender<Value, Outcome> {
  readonly [KEY_TOKEN]: "channel-sender";
  readonly [TYPE_TOKEN]?: readonly [Value, Outcome];
}

declare const TYPE_TOKEN: unique symbol;
