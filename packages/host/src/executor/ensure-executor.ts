import type { Executor } from "@shajara/kernel";
import { ShajaraPacer } from "./shajara-pacer";
import { createExecutor } from "@shajara/kernel";

export function ensureExecutor(): Executor {
  executorSingleton ??= createExecutor(new ShajaraPacer());
  return executorSingleton;
}

let executorSingleton: Executor | null = null;
