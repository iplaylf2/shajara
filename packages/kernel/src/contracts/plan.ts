import type { Syscall, SyscallReturn } from "./syscall";

export type Blueprint<Result = unknown> = () => Plan<Result>;
export type Plan<Result = unknown> = ImpurePlan<Syscall, Result, unknown> | PurePlan<Result>;

export interface PurePlan<Result = unknown> {
  readonly kind: "pure";
  readonly value: Result;
}

// oxlint-disable-next-line id-length
export interface ImpurePlan<S extends Syscall = Syscall, Result = unknown, Else = Result> {
  readonly kind: "impure";
  readonly syscall: S;
  readonly terminate: () => Plan<Else>;
  readonly then: (returnValue: SyscallReturn<S>) => Plan<Result>;
}

export function purePlan<Result>(value: Result): PurePlan<Result> {
  return { kind: "pure", value };
}

// oxlint-disable-next-line id-length
export function impurePlan<S extends Syscall, Result, Else>(
  syscall: S,
  then: (returnValue: SyscallReturn<S>) => Plan<Result>,
  terminate: () => Plan<Else>,
): ImpurePlan<S, Result, Else> {
  return { kind: "impure", syscall, terminate, then };
}
