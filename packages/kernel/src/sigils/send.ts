import type { ECHO_TOKEN, MessageKey, ScopeRef, Sigil } from "#src/contracts";

export function send<Value>(
  scope: ScopeRef<unknown>,
  messageKey: MessageKey<Value>,
  value: Value,
): SendSigil<Value> {
  return {
    kind: "send",
    messageKey,
    scope,
    value,
  };
}

export interface SendSigil<Value> extends Sigil {
  readonly kind: "send";
  readonly scope: ScopeRef<unknown>;
  readonly messageKey: MessageKey<Value>;
  readonly value: Value;
  readonly [ECHO_TOKEN]?: readonly [void];
}
