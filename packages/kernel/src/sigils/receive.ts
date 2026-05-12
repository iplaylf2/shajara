import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelReceiver } from "./channel";
import type { TaggedUnion } from "type-fest";

/**
 * Models blocking channel receive.
 *
 * @param receiver - Channel receiver endpoint.
 * @returns Receive instruction.
 */
export function receive<Value, Outcome>(
  receiver: ChannelReceiver<Value, Outcome>,
): ReceiveSigil<Value, Outcome> {
  return {
    kind: "receive",
    receiver,
  };
}

/** Sigil shape for blocking channel receive. */
export interface ReceiveSigil<Value, Outcome> extends SigilShape {
  readonly kind: "receive";
  readonly receiver: ChannelReceiver<Value, Outcome>;
  readonly [ECHO_TOKEN]?: readonly [ReceiveResult<Value, Outcome>];
}

/** Result of receiving from a channel. */
export type ReceiveResult<Value, Outcome> = TaggedUnion<
  "kind",
  { value: { readonly value: Value }; closed: { readonly outcome: Outcome }; revoked: {} }
>;
