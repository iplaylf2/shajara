import type { ContextKey, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export function unbind(key: ContextKey<unknown>): UnbindSyscall {
  return {
    key,
    kind: "unbind",
  };
}

export interface UnbindSyscall extends Syscall {
  readonly kind: "unbind";
  readonly key: ContextKey<unknown>;
  readonly [RETURN_TOKEN]?: readonly [void];
}
