import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { ChannelSender } from "./channel";
import type { Option } from "#/utils/index";
import type { SendResult } from "./send";

/**
 * Creates a sigil that attempts one channel send without blocking.
 *
 * @returns Try-send sigil whose echo is an immediate result or `none`.
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

/** Sigil that attempts one channel send without blocking. */
export interface TrySendSigil<Value, Outcome> extends SigilShape {
  readonly kind: "trySend";
  readonly sender: ChannelSender<Value, Outcome>;
  readonly value: Value;
  readonly [ECHO_TOKEN]?: readonly [Option<SendResult<Outcome>>];
}
