import type { ScopeRef, Signal, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export interface ReceiveResult<ReceiveValue> {
  readonly value: ReceiveValue;
  readonly from: ScopeRef<unknown>;
}

export interface ReceiveSyscall<ReceiveValue> extends Syscall {
  readonly kind: "receive";
  readonly signal: Signal<ReceiveValue>;
  readonly [RETURN_TOKEN]?: readonly [ReceiveResult<ReceiveValue>];
}

export function receive<ReceiveValue>(signal: Signal<ReceiveValue>): ReceiveSyscall<ReceiveValue> {
  return {
    kind: "receive",
    signal,
  };
}
