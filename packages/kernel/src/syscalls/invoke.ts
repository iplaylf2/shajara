import type { CapabilityRef } from "#src/syscalls-kit/capability";
import type { Syscall } from "#src/syscalls-kit/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface InvokeSyscall<Method extends string = string> extends Syscall<void> {
  readonly kind: "invoke";
  readonly capability: CapabilityRef<Method>;
  readonly method: Method;
  readonly args: readonly unknown[];
}

export function invoke<Method extends string = string>(
  _capability: CapabilityRef<Method>,
  _method: Method,
  _args: readonly unknown[],
): InvokeSyscall<Method> {
  return notImplemented("kernel syscall 'invoke'");
}
