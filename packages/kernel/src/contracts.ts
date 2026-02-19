export type RuntimeErrorCode =
  | "ScopeTerminating"
  | "TargetScopeTerminating"
  | "InvalidCapability"
  | "NoSuchMethod"
  | "NotFound"
  | "NotRunnable"
  | "NotInScope"
  | "NotVisible";

export interface RuntimeError {
  readonly code: RuntimeErrorCode;
}

export type Result<ReturnValue> =
  | { readonly kind: "ok"; readonly value: ReturnValue }
  | { readonly kind: "err"; readonly error: RuntimeError };

export interface Syscall<ReturnValue> {
  readonly kind: string;
  readonly _return?: ReturnValue;
}

export interface PurePlan<ReturnValue> {
  readonly kind: "pure";
  readonly value: ReturnValue;
}

export interface ImpurePlan<SyscallReturnValue, ReturnValue> {
  readonly kind: "impure";
  readonly syscall: Syscall<SyscallReturnValue>;
  readonly then: (result: Result<SyscallReturnValue>) => Plan<ReturnValue>;
  readonly terminate: () => Plan<ReturnValue>;
}

export type Plan<ReturnValue> = PurePlan<ReturnValue> | ImpurePlan<unknown, ReturnValue>;

export type Blueprint<ReturnValue> = () => Plan<ReturnValue>;
