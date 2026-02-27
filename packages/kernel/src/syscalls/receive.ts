import type { Syscall } from "#src/contracts";

export interface ReceiveSyscall<ReceiveValue> extends Syscall {
  readonly kind: "receive";
  readonly return?: readonly [ReceiveValue];
}

export function receive<ReceiveValue>(): ReceiveSyscall<ReceiveValue> {
  return {
    kind: "receive",
  };
}
