import type { Executor } from "@shajara/kernel";
import { OperationContextError } from "#/errors/index.js";
import type { RiteCoroutine } from "#/contracts/index.js";
import { currentExecutorKey } from "@shajara/kernel";
import { lookup } from "#/primitives/index.js";

export function* currentExecutor(): RiteCoroutine<Executor> {
  const [isFound, executor] = yield* lookup(currentExecutorKey);

  if (!isFound) {
    throw new OperationContextError();
  }

  return executor;
}
