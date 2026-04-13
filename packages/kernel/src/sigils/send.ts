import type { ECHO_TOKEN, MessageKey, ScopeRef, SigilShape } from "#/contracts";

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

export interface SendSigil<Value> extends SigilShape {
  readonly kind: "send";
  readonly scope: ScopeRef<unknown>;
  readonly messageKey: MessageKey<Value>;
  readonly value: Value;
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
