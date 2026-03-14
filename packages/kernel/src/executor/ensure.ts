import { DomainInterpreter } from "#src/interpreters";
import type { Executor } from "./create";
import { createExecutor } from "./create";

let executorSingleton: Executor | null = null;

export function ensureExecutor(): Executor {
  executorSingleton ??= createExecutor(new DomainInterpreter());
  return executorSingleton;
}
