export interface Syscall<ReturnValue> {
  readonly kind: string;
  readonly _return?: ReturnValue;
}
