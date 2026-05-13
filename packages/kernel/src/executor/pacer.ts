import type { Disposer } from "#/utils/index";

/** Embedding-environment contract for executor slice control. */
export interface Pacer {
  /**
   * Begins the next executor slice.
   *
   * @returns Slice controller for the current turn.
   */
  beginSlice(): Slice;

  /**
   * Schedules an executor continuation after the current slice.
   *
   * @returns Disposer that cancels the scheduled continuation.
   */
  continueLater(work: () => void): Disposer;
}

/** Controller for the current executor slice. */
export interface Slice {
  /**
   * Reports whether the current slice should yield.
   *
   */
  shouldYield(): boolean;
}
