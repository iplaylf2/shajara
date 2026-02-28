import type { Channel, ScopeRef, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export function receive<ReceiveValue>(
  channel: Channel<ReceiveValue>,
): ReceiveSyscall<ReceiveValue> {
  return {
    channel,
    kind: "receive",
  };
}

export interface ReceiveSyscall<ReceiveValue> extends Syscall {
  readonly kind: "receive";
  readonly channel: Channel<ReceiveValue>;
  readonly [RETURN_TOKEN]?: readonly [ReceiveResult<ReceiveValue>];
}

export interface ReceiveResult<ReceiveValue> {
  readonly value: ReceiveValue;
  readonly from: ScopeRef<unknown>;
}
