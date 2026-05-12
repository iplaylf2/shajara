/** Shared structural fields for kernel failure values. */
export interface FailureShape {
  readonly kind: string;
  readonly message: string;
}
