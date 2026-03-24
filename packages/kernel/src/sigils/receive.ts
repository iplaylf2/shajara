import type { ECHO_TOKEN, MessageKey, SigilShape } from "#/contracts";

export function receive<ReceiveValue>(
  messageKey: MessageKey<ReceiveValue>,
): ReceiveSigil<ReceiveValue> {
  return {
    kind: "receive",
    messageKey,
  };
}

export interface ReceiveSigil<Value> extends SigilShape {
  readonly kind: "receive";
  readonly messageKey: MessageKey<Value>;
  readonly [ECHO_TOKEN]?: readonly [Value];
}
