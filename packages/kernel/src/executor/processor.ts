import type { Suppressor } from "#/contracts";

/** Queue or runner that accepts process tasks selected by a scheduler. */
export interface Processor {
  /**
   * Enqueues interpreter work.
   *
   * @param task - Work item.
   * @returns No value.
   */
  admit(task: ProcessorTask): void;
}

/** Runnable unit of interpreter work. */
export interface ProcessorTask {
  /**
   * Advances interpreter work.
   *
   * @param suppressor - Fault sink.
   * @returns Task state after the step.
   */
  step(suppressor: Suppressor): ProcessorTaskStatus;
}

/** Result of advancing one processor task. */
export type ProcessorTaskStatus = "cede" | "exited" | "ready" | "waiting";
