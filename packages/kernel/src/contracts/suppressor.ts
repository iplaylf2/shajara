/** Receives faults outside normal convergence. */
export interface Suppressor {
  /**
   * Captures one fault.
   *
   * @param fault - Captured value.
   * @returns No value.
   */
  capture(fault: unknown): void;
}
