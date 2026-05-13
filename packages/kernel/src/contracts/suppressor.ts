/** Captures out-of-band faults without converting them into in-band failure values. */
export interface Suppressor {
  /** Records one fault observed outside normal settlement. */
  capture(fault: unknown): void;
}
