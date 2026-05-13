/** Common discriminant and message shape for in-band failure values. */
export interface FailureShape {
  readonly kind: string;
  readonly message: string;
}
