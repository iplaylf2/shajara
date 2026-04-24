import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelSender } from "./channel";
import type { TaggedUnion } from "type-fest";

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

export interface SendSigil<Value, Outcome> extends SigilShape {
  readonly kind: "send";
  readonly sender: ChannelSender<Value, Outcome>;
  readonly value: Value;
  readonly [ECHO_TOKEN]?: readonly [SendResult<Outcome>];
}

export type SendResult<Outcome> = TaggedUnion<
  "kind",
  { sent: {}; closed: { readonly outcome: Outcome }; revoked: {} }
>;
