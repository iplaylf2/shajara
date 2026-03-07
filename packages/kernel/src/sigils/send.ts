import type { Channel, ECHO_TOKEN, ScopeRef, Sigil } from "#src/contracts";

export function send<Value>(
  scope: ScopeRef<unknown>,
  channel: Channel<Value>,
  value: Value,
): SendSigil<Value> {
  return {
    channel,
    kind: "send",
    scope,
    value,
  };
}

export interface SendSigil<Value> extends Sigil {
  readonly kind: "send";
  readonly scope: ScopeRef<unknown>;
  readonly channel: Channel<Value>;
  readonly value: Value;
  readonly [ECHO_TOKEN]?: readonly [void];
}
