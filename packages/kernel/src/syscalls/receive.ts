import type { ScopeRef, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export interface ReceiveResult<ReceiveValue> {
  readonly value: ReceiveValue;
  readonly from: ScopeRef<unknown>;
}

export interface ReceiveSyscall<ReceiveValue> extends Syscall {
  readonly kind: "receive";
  readonly [RETURN_TOKEN]?: readonly [ReceiveResult<ReceiveValue>];
}

export function receive<ReceiveValue>(): ReceiveSyscall<ReceiveValue> {
  return {
    kind: "receive",
  };
}
