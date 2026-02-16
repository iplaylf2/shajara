type RuntimeErrorCode =
  | "ScopeTerminating"
  | "TargetScopeTerminating"
  | "InvalidCapability"
  | "NoSuchMethod"
  | "NotFound"
  | "NotRunnable"
  | "NotInScope"
  | "NotVisible";

interface RuntimeError {
  readonly code: RuntimeErrorCode;
}

type Result<ReturnValue> =
  | { readonly kind: "ok"; readonly value: ReturnValue }
  | { readonly kind: "err"; readonly error: RuntimeError };

interface Syscall<ReturnValue> {
  readonly kind: string;
  readonly _return?: ReturnValue;
}

interface PurePlan<ReturnValue> {
  readonly kind: "pure";
  readonly value: ReturnValue;
}

interface ImpurePlan<SyscallReturnValue, ReturnValue> {
  readonly kind: "impure";
  readonly syscall: Syscall<SyscallReturnValue>;
  readonly then: (result: Result<SyscallReturnValue>) => Plan<ReturnValue>;
  readonly terminate: () => Plan<ReturnValue>;
}

type Plan<ReturnValue> =
  | PurePlan<ReturnValue>
  | ImpurePlan<unknown, ReturnValue>;

type Blueprint<ReturnValue> = () => Plan<ReturnValue>;

export type {
  Blueprint,
  ImpurePlan,
  Plan,
  PurePlan,
  Result,
  RuntimeError,
  RuntimeErrorCode,
  Syscall,
};
