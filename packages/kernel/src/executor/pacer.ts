import type { Disposer } from "#/utils/index.js";

/** Embedding-environment contract for executor slice control and deferred continuation. */
export interface Pacer {
  /**
   * Begins one synchronous executor slice.
   *
   * @returns Slice controller for the current turn.
   */
  beginSlice: () => Slice;

  /**
   * Schedules executor work to continue after the current slice.
   *
   * @returns Disposer that cancels the scheduled continuation.
   */
  continueLater: (work: () => void) => Disposer;
}

/** Controller for the current executor slice. */
export interface Slice {
  /**
   * Reports whether the current synchronous slice should yield.
   *
   * @returns `true` when the executor should defer remaining work.
   */
  shouldYield: () => boolean;
}
