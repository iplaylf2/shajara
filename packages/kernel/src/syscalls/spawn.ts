import type { Blueprint } from "#src/plan";
import type { CapabilityRef } from "#src/syscalls-kit/capability";
import type { ProcessRef } from "#src/syscalls-kit/process";
import type { ScopeRef } from "#src/scope";
import type { Syscall } from "#src/syscalls-kit/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface SpawnRef<ReturnValue = unknown> extends ScopeRef {
  readonly _return?: ReturnValue;
}

export interface SpawnOptions {
  readonly call?: { readonly method: string; readonly args: readonly unknown[] };
}

export interface SpawnDescriptor<ReturnValue, SpawnedRef extends SpawnRef<ReturnValue>> {
  readonly scope: SpawnedRef;
  readonly rootProcess: ProcessRef<ReturnValue>;
  readonly capability: CapabilityRef;
  readonly post: <PostedValue>(value: PostedValue) => void;
}

export interface SpawnSyscall<
  ReturnValue,
  SpawnedRef extends SpawnRef<ReturnValue> = SpawnRef<ReturnValue>,
> extends Syscall<SpawnDescriptor<ReturnValue, SpawnedRef>> {
  readonly kind: "spawn";
  readonly blueprint: Blueprint<ReturnValue>;
  readonly options: SpawnOptions | undefined;
}

export function spawn<
  ReturnValue,
  SpawnedRef extends SpawnRef<ReturnValue> = SpawnRef<ReturnValue>,
>(
  _blueprint: Blueprint<ReturnValue>,
  _options?: SpawnOptions | undefined,
): SpawnSyscall<ReturnValue, SpawnedRef> {
  return notImplemented("kernel syscall 'spawn'");
}
