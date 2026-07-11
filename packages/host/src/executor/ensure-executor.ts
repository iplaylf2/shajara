import type { Executor } from "@shajara/kernel";
import { ShajaraPacer } from "./shajara-pacer.js";
import { createExecutor } from "@shajara/kernel";

export function ensureExecutor(): Executor {
  if (executorSingleton) {
    return executorSingleton;
  }

  // oxlint-disable-next-line init-declarations
  let pacer!: ShajaraPacer;
  const executor = createExecutor((flushTurn) => {
    pacer = new ShajaraPacer(flushTurn);
    return pacer;
  });
  executor.onSettled(executor.scope.exitFuture, () => {
    pacer[Symbol.dispose]();
  });
  executorSingleton = executor;

  return executor;
}

// oxlint-disable-next-line init-declarations
let executorSingleton!: Executor;
