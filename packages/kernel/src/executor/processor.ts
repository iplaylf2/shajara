import type { Suppressor } from "#/contracts";

/** Scheduler target that progresses runnable process tasks. */
export interface Processor {
  /** Accepts a runnable process task for progression. */
  admit(task: ProcessorTask): void;
}

/** Runnable process task submitted to a processor. */
export interface ProcessorTask {
  /**
   * Advances this task by one process step.
   *
   * @returns Task state after the step.
   */
  step(suppressor: Suppressor): ProcessorTaskStatus;
}

/** Process-task state after one step. */
export type ProcessorTaskStatus = "cede" | "exited" | "ready" | "waiting";
