import type { Executor } from "@shajara/kernel";
import { OperationContextError } from "#/errors";
import type { RiteCoroutine } from "#/contracts";
import { currentExecutorKey } from "@shajara/kernel";
import { lookup } from "#/primitives/index";

export function* currentExecutor(): RiteCoroutine<Executor> {
  const [isFound, executor] = yield* lookup(currentExecutorKey);

  if (!isFound) {
    throw new OperationContextError();
  }

  return executor;
}
