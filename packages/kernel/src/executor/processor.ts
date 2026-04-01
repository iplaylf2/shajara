export interface Processor {
  drive(task: ProcessorTask): void;
}

export interface ProcessorTask {
  step(): ProcessorTaskState;
}

export type ProcessorTaskState = "continue" | "exited" | "waiting";
