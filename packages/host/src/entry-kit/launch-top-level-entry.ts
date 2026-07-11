import type { Executor } from "@shajara/kernel";
import type { RiteRoutine } from "#/contracts/index.js";
import { acquireExecutorLease } from "#/executor/index.js";
import type { LaunchedEntry, RunOptions } from "./launch.js";
import { launchEntry } from "./launch.js";

export function launchTopLevelEntry<Result>(
  routine: RiteRoutine<Result>,
  options?: RunOptions,
): TopLevelEntry<Result> {
  const lease = acquireExecutorLease();
  const { executor } = lease;

  try {
    const entry = launchEntry(executor, executor.scope, routine, options);
    executor.onSettled(entry.scope.exitFuture, () => {
      lease[Symbol.dispose]();
    });

    return { ...entry, executor };
  } catch (error) {
    lease[Symbol.dispose]();
    throw error;
  }
}

export interface TopLevelEntry<Result> extends LaunchedEntry<Result> {
  readonly executor: Executor;
}
