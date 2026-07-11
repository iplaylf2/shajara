import type { ECHO_TOKEN, SigilShape } from "#/contracts/index.js";
import type { ChannelSender } from "./channel.js";

/**
 * Creates a sigil that waits for a channel sender to accept a value.
 *
 * @returns Send sigil whose echo is an accepted send or terminal channel state.
 */
export function send<Value, Outcome>(
  sender: ChannelSender<Value, Outcome>,
  value: Value,
): SendSigil<Value, Outcome> {
  return {
    kind: "send",
    sender,
    value,
  };
}

/** Sigil that waits for a channel sender to accept a value. */
export interface SendSigil<Value, Outcome> extends SigilShape {
  readonly kind: "send";
  readonly sender: ChannelSender<Value, Outcome>;
  readonly value: Value;
  readonly [ECHO_TOKEN]?: readonly [SendResult<Outcome>];
}

/** Send echo: accepted value, explicit close, or revoked terminal state. */
export type SendResult<Outcome> =
  | { readonly kind: "sent" }
  | { readonly kind: "closed"; readonly outcome: Outcome }
  | { readonly kind: "revoked" };
