import type { Syscall } from "#src/syscalls-kit/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface ReceiveSyscall<ReceiveValue = unknown> extends Syscall<ReceiveValue> {
  readonly kind: "receive";
}

export function receive<ReceiveValue = unknown>(): ReceiveSyscall<ReceiveValue> {
  return notImplemented("kernel syscall 'receive'");
}
