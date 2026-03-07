import type { Channel, ScopeRef, Sigil } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export function send<Value>(
  scope: ScopeRef<unknown>,
  channel: Channel<Value>,
  value: Value,
): SendSyscall<Value> {
  return {
    channel,
    kind: "send",
    scope,
    value,
  };
}

export interface SendSyscall<Value> extends Sigil {
  readonly kind: "send";
  readonly scope: ScopeRef<unknown>;
  readonly channel: Channel<Value>;
  readonly value: Value;
  readonly [RETURN_TOKEN]?: readonly [void];
}
