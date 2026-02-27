import type { RETURN_TOKEN } from "#src/utils";
import type { Syscall } from "#src/contracts";

export interface ReceiveSyscall<ReceiveValue> extends Syscall {
  readonly kind: "receive";
  readonly [RETURN_TOKEN]?: readonly [ReceiveValue];
}

export function receive<ReceiveValue>(): ReceiveSyscall<ReceiveValue> {
  return {
    kind: "receive",
  };
}
