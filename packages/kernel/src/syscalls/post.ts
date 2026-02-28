import type { ScopeRef, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export interface PostSyscall extends Syscall {
  readonly kind: "post";
  readonly scope: ScopeRef<unknown>;
  readonly value: unknown;
  readonly [RETURN_TOKEN]?: readonly [void];
}

export function post(scope: ScopeRef<unknown>, value: unknown): PostSyscall {
  return {
    kind: "post",
    scope,
    value,
  };
}
