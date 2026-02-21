import type { ProcessRef } from "#src/syscalls-kit/process";
import type { Syscall } from "#src/syscalls-kit/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface ArmSyscall<Process extends ProcessRef = ProcessRef> extends Syscall<void> {
  readonly kind: "arm";
  readonly process: Process;
}

export function arm<Process extends ProcessRef = ProcessRef>(
  _process: Process,
): ArmSyscall<Process> {
  return notImplemented("kernel syscall 'arm'");
}
