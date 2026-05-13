import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelSender } from "./channel";
import type { Option } from "#/utils/index";
import type { SendResult } from "./send";

/**
 * Encodes non-blocking channel send as a sigil.
 *
 * @returns `trySend` sigil.
 */
export function trySend<Value, Outcome>(
  sender: ChannelSender<Value, Outcome>,
  value: Value,
): TrySendSigil<Value, Outcome> {
  return {
    kind: "trySend",
    sender,
    value,
  };
}

/** Non-blocking channel send sigil. */
export interface TrySendSigil<Value, Outcome> extends SigilShape {
  readonly kind: "trySend";
  readonly sender: ChannelSender<Value, Outcome>;
  readonly value: Value;
  readonly [ECHO_TOKEN]?: readonly [Option<SendResult<Outcome>>];
}
