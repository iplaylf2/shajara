import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelSender } from "./channel";
import type { TaggedUnion } from "type-fest";

export function send<Value>(sender: ChannelSender<Value>, value: Value): SendSigil<Value> {
  return {
    kind: "send",
    sender,
    value,
  };
}

export interface SendSigil<Value> extends SigilShape {
  readonly kind: "send";
  readonly sender: ChannelSender<Value>;
  readonly value: Value;
  readonly [ECHO_TOKEN]?: readonly [SendResult];
}

export type SendResult = TaggedUnion<"kind", { sent: {}; closed: {}; revoked: {} }>;
