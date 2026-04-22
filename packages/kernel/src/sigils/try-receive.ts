import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelReceiver } from "./channel";
import type { Option } from "#/utils/index";
import type { ReceiveResult } from "./receive";

export function tryReceive<Value>(receiver: ChannelReceiver<Value>): TryReceiveSigil<Value> {
  return {
    kind: "tryReceive",
    receiver,
  };
}

export interface TryReceiveSigil<Value> extends SigilShape {
  readonly kind: "tryReceive";
  readonly receiver: ChannelReceiver<Value>;
  readonly [ECHO_TOKEN]?: readonly [Option<ReceiveResult<Value>>];
}
