import type { ChannelReceiver, ChannelSender } from "./channel";
import type { ECHO_TOKEN, SigilShape } from "#/contracts";

export function close(endpoint: ChannelReceiver<unknown> | ChannelSender<unknown>): CloseSigil {
  return {
    endpoint,
    kind: "close",
  };
}

export interface CloseSigil extends SigilShape {
  readonly kind: "close";
  readonly endpoint: ChannelReceiver<unknown> | ChannelSender<unknown>;
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
