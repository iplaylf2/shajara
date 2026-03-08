import type { ECHO_TOKEN, MessageKey, ScopeRef, Sigil } from "#src/contracts";

export function receive<ReceiveValue>(
  messageKey: MessageKey<ReceiveValue>,
): ReceiveSigil<ReceiveValue> {
  return {
    kind: "receive",
    messageKey,
  };
}

export interface ReceiveSigil<ReceiveValue> extends Sigil {
  readonly kind: "receive";
  readonly messageKey: MessageKey<ReceiveValue>;
  readonly [ECHO_TOKEN]?: readonly [ReceiveResult<ReceiveValue>];
}

export interface ReceiveResult<ReceiveValue> {
  readonly value: ReceiveValue;
  readonly from: ScopeRef<unknown>;
}
