import type { ECHO_TOKEN, MessageKey, Sigil } from "#src/contracts";

export function receive<ReceiveValue>(
  messageKey: MessageKey<ReceiveValue>,
): ReceiveSigil<ReceiveValue> {
  return {
    kind: "receive",
    messageKey,
  };
}

export interface ReceiveSigil<Value> extends Sigil {
  readonly kind: "receive";
  readonly messageKey: MessageKey<Value>;
  readonly [ECHO_TOKEN]?: readonly [Value];
}
