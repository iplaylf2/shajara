import type { Syscall } from "#src/syscalls-kit/syscall";

export interface PurePlan<ReturnValue> {
  readonly kind: "pure";
  readonly value: ReturnValue;
}

export interface ImpurePlan<SyscallReturnValue, ReturnValue> {
  readonly kind: "impure";
  readonly syscall: Syscall<SyscallReturnValue>;
  readonly then: (value: SyscallReturnValue) => Plan<ReturnValue>;
  readonly terminate: () => Plan<ReturnValue>;
}

export type Plan<ReturnValue> = PurePlan<ReturnValue> | ImpurePlan<unknown, ReturnValue>;

export type Blueprint<ReturnValue> = () => Plan<ReturnValue>;
