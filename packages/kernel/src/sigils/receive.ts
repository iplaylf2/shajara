import type { ECHO_TOKEN, SigilShape } from "#/contracts/index.js";
import type { ChannelReceiver } from "./channel.js";

/**
 * Creates a sigil that waits for a channel receiver to produce a value or terminal state.
 *
 * @returns Receive sigil whose echo is a delivered value or terminal channel state.
 */
export function receive<Value, Outcome>(
  receiver: ChannelReceiver<Value, Outcome>,
): ReceiveSigil<Value, Outcome> {
  return {
    kind: "receive",
    receiver,
  };
}

/** Sigil that waits for a channel receiver to produce a value or terminal state. */
export interface ReceiveSigil<Value, Outcome> extends SigilShape {
  readonly kind: "receive";
  readonly receiver: ChannelReceiver<Value, Outcome>;
  readonly [ECHO_TOKEN]?: readonly [ReceiveResult<Value, Outcome>];
}

/** Receive echo: delivered value, explicit close, or revoked terminal state. */
export type ReceiveResult<Value, Outcome> =
  | { readonly kind: "value"; readonly value: Value }
  | { readonly kind: "closed"; readonly outcome: Outcome }
  | { readonly kind: "revoked" };
