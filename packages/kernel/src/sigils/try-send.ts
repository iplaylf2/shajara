import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelSender } from "./channel";
import type { Option } from "#/utils/index";
import type { SendResult } from "./send";

export function trySend<Value>(sender: ChannelSender<Value>, value: Value): TrySendSigil<Value> {
  return {
    kind: "trySend",
    sender,
    value,
  };
}

export interface TrySendSigil<Value> extends SigilShape {
  readonly kind: "trySend";
  readonly sender: ChannelSender<Value>;
  readonly value: Value;
  readonly [ECHO_TOKEN]?: readonly [Option<SendResult>];
}
