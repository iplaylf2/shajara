import type { Plan } from "#src/contracts";
import { receive as syscallReceive } from "#src/syscalls";

export function receive<ReceiveValue>(): Plan<ReceiveValue> {
  return {
    kind: "impure",
    syscall: syscallReceive<ReceiveValue>(),
    terminate: () => receive<ReceiveValue>(),
    then: (value: unknown) => ({ kind: "pure", value: value as ReceiveValue }),
  };
}
