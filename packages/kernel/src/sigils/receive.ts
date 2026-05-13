import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelReceiver } from "./channel";
import type { TaggedUnion } from "type-fest";

/**
 * Encodes blocking channel receive as a sigil.
 *
 * @returns `receive` sigil.
 */
export function receive<Value, Outcome>(
  receiver: ChannelReceiver<Value, Outcome>,
): ReceiveSigil<Value, Outcome> {
  return {
    kind: "receive",
    receiver,
  };
}

/** Blocking channel receive sigil. */
export interface ReceiveSigil<Value, Outcome> extends SigilShape {
  readonly kind: "receive";
  readonly receiver: ChannelReceiver<Value, Outcome>;
  readonly [ECHO_TOKEN]?: readonly [ReceiveResult<Value, Outcome>];
}

/** Receive echo: delivered value, explicit close, or revoked terminal state. */
export type ReceiveResult<Value, Outcome> = TaggedUnion<
  "kind",
  { value: { readonly value: Value }; closed: { readonly outcome: Outcome }; revoked: {} }
>;
