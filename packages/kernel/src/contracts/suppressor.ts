/** Captures out-of-band faults without converting them into in-band failure values. */
export interface Suppressor {
  /** Records one captured fault. */
  capture(fault: unknown): void;
}
