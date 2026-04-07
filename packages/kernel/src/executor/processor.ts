import type { Suppressor } from "#/contracts";

export interface Processor {
  drive(task: ProcessorTask): void;
}

export interface ProcessorTask {
  step(suppressor: Suppressor): ProcessorTaskStatus;
}

export type ProcessorTaskStatus = "cede" | "exited" | "ready" | "waiting";
