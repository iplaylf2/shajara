import type { Plan, Result } from "#src/contracts";
import { receive as syscallReceive } from "#src/syscalls";

function fromReceiveResult<ReceiveValue>(result: Result<ReceiveValue>): Plan<ReceiveValue> {
  if (result.kind === "ok") {
    return {
      kind: "pure",
      value: result.value,
    };
  }

  throw result.error;
}

export function receive<ReceiveValue = unknown>(): Plan<ReceiveValue> {
  return {
    kind: "impure",
    syscall: syscallReceive<ReceiveValue>(),
    terminate: () => receive<ReceiveValue>(),
    then: (result: Result<unknown>) => fromReceiveResult(result as Result<ReceiveValue>),
  };
}
