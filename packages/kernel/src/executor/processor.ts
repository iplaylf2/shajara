import type { Suppressor } from "#/contracts";

/** Processor selected by a scheduler to progress runnable processes. */
export interface Processor {
  /** Accepts a runnable process task. */
  admit(task: ProcessorTask): void;
}

/** Runnable process task submitted to a processor. */
export interface ProcessorTask {
  /**
   * Advances this task once.
   *
   * @returns Task state after the step.
   */
  step(suppressor: Suppressor): ProcessorTaskStatus;
}

/** Process-task state after one step. */
export type ProcessorTaskStatus = "cede" | "exited" | "ready" | "waiting";
