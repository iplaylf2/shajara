import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelReceiver } from "./channel";
import type { Option } from "#/utils/index";
import type { ReceiveResult } from "./receive";

/**
 * Creates a sigil that attempts one channel receive without blocking.
 *
 * @returns Try-receive sigil whose echo is an immediate result or `none`.
 */
export function tryReceive<Value, Outcome>(
  receiver: ChannelReceiver<Value, Outcome>,
): TryReceiveSigil<Value, Outcome> {
  return {
    kind: "tryReceive",
    receiver,
  };
}

/** Sigil that attempts one channel receive without blocking. */
export interface TryReceiveSigil<Value, Outcome> extends SigilShape {
  readonly kind: "tryReceive";
  readonly receiver: ChannelReceiver<Value, Outcome>;
  readonly [ECHO_TOKEN]?: readonly [Option<ReceiveResult<Value, Outcome>>];
}
