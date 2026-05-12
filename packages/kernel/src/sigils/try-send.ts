import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelSender } from "./channel";
import type { Option } from "#/utils/index";
import type { SendResult } from "./send";

/**
 * Models non-blocking channel send.
 *
 * @param sender - Channel sender endpoint.
 * @param value - Payload.
 * @returns Try-send instruction.
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

/** Sigil shape for non-blocking channel send. */
export interface TrySendSigil<Value, Outcome> extends SigilShape {
  readonly kind: "trySend";
  readonly sender: ChannelSender<Value, Outcome>;
  readonly value: Value;
  readonly [ECHO_TOKEN]?: readonly [Option<SendResult<Outcome>>];
}
