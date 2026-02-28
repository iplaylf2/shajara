import type { Channel, ScopeRef, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export interface SendSyscall<Value> extends Syscall {
  readonly kind: "send";
  readonly scope: ScopeRef<unknown>;
  readonly channel: Channel<Value>;
  readonly value: Value;
  readonly [RETURN_TOKEN]?: readonly [void];
}

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
