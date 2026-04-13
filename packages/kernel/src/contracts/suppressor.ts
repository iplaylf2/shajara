export interface Suppressor {
  capture(error: unknown): void;
}
