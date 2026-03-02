import type { Channel, Plan } from "#src/contracts";
import type { ReceiveResult } from "#src/syscalls";
import { plan } from "#src/internal/fp";
import { receive as receiveSyscall } from "#src/syscalls";

export function receive<ReceiveValue>(
  channel: Channel<ReceiveValue>,
): Plan<ReceiveResult<ReceiveValue>> {
  return plan.liftF(receiveSyscall(channel));
}
