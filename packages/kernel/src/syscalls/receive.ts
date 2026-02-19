import type { Syscall } from "#src/contracts";

export interface ReceiveSyscall<ReceiveValue = unknown> extends Syscall<ReceiveValue> {
  readonly kind: "receive";
}

export function receive<ReceiveValue = unknown>(): ReceiveSyscall<ReceiveValue> {
  return { kind: "receive" };
}
