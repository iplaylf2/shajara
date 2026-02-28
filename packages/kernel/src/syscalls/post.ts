import type { ScopeRef, Signal, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export interface PostSyscall<Value> extends Syscall {
  readonly kind: "post";
  readonly scope: ScopeRef<unknown>;
  readonly signal: Signal<Value>;
  readonly value: Value;
  readonly [RETURN_TOKEN]?: readonly [void];
}

export function post<Value>(
  scope: ScopeRef<unknown>,
  signal: Signal<Value>,
  value: Value,
): PostSyscall<Value> {
  return {
    kind: "post",
    scope,
    signal,
    value,
  };
}
