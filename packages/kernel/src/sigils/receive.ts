import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelReceiver } from "./channel";
import type { TaggedUnion } from "type-fest";

export function receive<Value>(receiver: ChannelReceiver<Value>): ReceiveSigil<Value> {
  return {
    kind: "receive",
    receiver,
  };
}

export interface ReceiveSigil<Value> extends SigilShape {
  readonly kind: "receive";
  readonly receiver: ChannelReceiver<Value>;
  readonly [ECHO_TOKEN]?: readonly [ReceiveResult<Value>];
}

export type ReceiveResult<Value> = TaggedUnion<
  "kind",
  { value: { readonly value: Value }; closed: {}; revoked: {} }
>;
