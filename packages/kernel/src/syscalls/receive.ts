import type { Syscall } from "#src/contracts/syscall";

export interface ReceiveSyscall<ReceiveValue = unknown> extends Syscall {
  readonly kind: "receive";
  readonly return?: readonly [ReceiveValue];
}

export function receive<ReceiveValue = unknown>(): ReceiveSyscall<ReceiveValue> {
  return {
    kind: "receive",
  };
}
