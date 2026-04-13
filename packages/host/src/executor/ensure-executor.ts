import type { Disposer } from "@shajara/kernel/utils";
import type { Executor } from "@shajara/kernel";
import { ShajaraPacer } from "./shajara-pacer";
import { createExecutor } from "@shajara/kernel";

export function ensureExecutor(): Executor {
  if (executorSingleton) {
    return executorSingleton;
  }

  const pacer = new ShajaraPacer();
  // oxlint-disable-next-line init-declarations
  let disposeTurnBinding!: Disposer;
  const executor = createExecutor((flushTurn) => {
    disposeTurnBinding = pacer.bindTurn(flushTurn);
    return pacer;
  });
  executor.onSettled(() => {
    disposeTurnBinding();
  });
  executorSingleton = executor;

  return executor;
}

// oxlint-disable-next-line init-declarations
let executorSingleton!: Executor;
