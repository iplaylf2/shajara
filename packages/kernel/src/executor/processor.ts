export interface Processor {
  drive(task: ProcessorTask): void;
}

export interface ProcessorTask {
  step(): ProcessorTaskStatus;
}

export type ProcessorTaskStatus = "cede" | "exited" | "ready" | "waiting";
