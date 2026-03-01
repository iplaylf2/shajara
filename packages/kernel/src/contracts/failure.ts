export interface Failure {
  readonly kind: string;
  message(): string;
}
