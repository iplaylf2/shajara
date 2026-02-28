import type { Syscall, SyscallReturn } from "./syscall";

export type Blueprint<Result> = () => Plan<Result>;

// oxlint-disable-next-line id-length
export function liftSyscall<S extends Syscall>(syscall: S): Plan<SyscallReturn<S>> {
  return impurePlan(syscall, purePlan, () => purePlan(null));
}

export type Plan<Result> = ImpurePlan<Syscall, Result> | PurePlan<Result>;

export function purePlan<Result>(value: Result): PurePlan<Result> {
  return { kind: "pure", value };
}

// oxlint-disable-next-line id-length
export function impurePlan<S extends Syscall, Result>(
  syscall: S,
  then: (returnValue: SyscallReturn<S>) => Plan<Result>,
  terminate: () => Plan<unknown>,
): ImpurePlan<S, Result> {
  return { kind: "impure", syscall, terminate, then };
}

export interface PurePlan<Result> {
  readonly kind: "pure";
  readonly value: Result;
}

// oxlint-disable-next-line id-length
export interface ImpurePlan<S extends Syscall, Result> {
  readonly kind: "impure";
  readonly syscall: S;
  readonly terminate: () => Plan<unknown>;
  readonly then: (returnValue: SyscallReturn<S>) => Plan<Result>;
}
