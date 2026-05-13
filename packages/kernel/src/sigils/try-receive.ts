import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelReceiver } from "./channel";
import type { Option } from "#/utils/index";
import type { ReceiveResult } from "./receive";

/**
 * Encodes non-blocking channel receive as a sigil.
 *
 * @returns `tryReceive` sigil.
 */
export function tryReceive<Value, Outcome>(
  receiver: ChannelReceiver<Value, Outcome>,
): TryReceiveSigil<Value, Outcome> {
  return {
    kind: "tryReceive",
    receiver,
  };
}

/** Non-blocking channel receive sigil. */
export interface TryReceiveSigil<Value, Outcome> extends SigilShape {
  readonly kind: "tryReceive";
  readonly receiver: ChannelReceiver<Value, Outcome>;
  readonly [ECHO_TOKEN]?: readonly [Option<ReceiveResult<Value, Outcome>>];
}
