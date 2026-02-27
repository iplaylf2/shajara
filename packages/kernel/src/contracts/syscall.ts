import type { RETURN_TOKEN } from "#src/utils";

// oxlint-disable id-length
export interface Syscall {
  readonly kind: string;
  readonly [RETURN_TOKEN]?: readonly [unknown];
}

export type SyscallReturn<T extends Syscall> =
  NonNullable<T[typeof RETURN_TOKEN]> extends readonly [infer R] ? R : never;
