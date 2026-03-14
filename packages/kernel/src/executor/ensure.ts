import type { Executor } from "./create";
import { ExecutorInterpreter } from "#src/interpreters";
import { createExecutor } from "./create";

let executorSingleton: Executor | null = null;

export function ensureExecutor(): Executor {
  executorSingleton ??= createExecutor(new ExecutorInterpreter());
  return executorSingleton;
}
