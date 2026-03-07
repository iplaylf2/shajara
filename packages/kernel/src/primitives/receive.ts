import type { Channel, Wisp } from "#src/contracts";
import type { ReceiveResult } from "#src/syscalls";
import { wisp } from "#src/internal/fp";
import { receive as receiveSyscall } from "#src/syscalls";

export type { ReceiveResult } from "#src/syscalls";

export function receive<ReceiveValue>(
  channel: Channel<ReceiveValue>,
): Wisp<ReceiveResult<ReceiveValue>> {
  return wisp.liftF(receiveSyscall(channel));
}
