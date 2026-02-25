// oxlint-disable id-length
export interface Syscall {
  readonly kind: string;
  readonly return?: readonly [unknown];
}

export type SyscallReturn<T extends Syscall> =
  NonNullable<T["return"]> extends readonly [infer R] ? R : never;
