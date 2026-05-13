import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelSender } from "./channel";
import type { TaggedUnion } from "type-fest";

/**
 * Encodes blocking channel send as a sigil.
 *
 * @returns `send` sigil.
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

/** Blocking channel send sigil. */
export interface SendSigil<Value, Outcome> extends SigilShape {
  readonly kind: "send";
  readonly sender: ChannelSender<Value, Outcome>;
  readonly value: Value;
  readonly [ECHO_TOKEN]?: readonly [SendResult<Outcome>];
}

/** Send echo: accepted value, explicit close, or revoked terminal state. */
export type SendResult<Outcome> = TaggedUnion<
  "kind",
  { sent: {}; closed: { readonly outcome: Outcome }; revoked: {} }
>;
