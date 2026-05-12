import type { Disposer } from "#/utils/index";

/** Host pacing contract for executor work. */
export interface Pacer {
  /**
   * Begins a work slice.
   *
   * @returns Current slice budget.
   */
  beginSlice(): Slice;

  /**
   * Defers follow-up work.
   *
   * @param work - Deferred callback.
   * @returns Disposer for the scheduled work.
   */
  continueLater(work: () => void): Disposer;
}

/** Current work-slice budget. */
export interface Slice {
  /**
   * Checks slice exhaustion.
   *
   * @returns True when the executor should yield.
   */
  shouldYield(): boolean;
}
