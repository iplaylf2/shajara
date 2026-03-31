import type { Executor } from "@shajara/kernel";

let executorSingleton: Executor | null = null;

export function ensureExecutor(): Executor {
  executorSingleton ??= createDefaultExecutor();
  return executorSingleton;
}

function createDefaultExecutor(): Executor {
  throw new Error("Not implemented: ensureExecutor default executor creation.");
}
