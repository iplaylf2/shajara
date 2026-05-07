import type { Executor, FutureKey, FutureResult, ScopeRef } from "#/index";

export async function waitForSettled<Result>(
  executor: Executor,
  source: FutureKey<Result> | SettlementSource<Result>,
  options?: WaitOptions,
): Promise<FutureResult<Result>> {
  const maxTurns = options?.maxTurns ?? DEFAULT_MAX_TURNS;
  const settled = Promise.withResolvers<FutureResult<Result>>();
  const unsubscribe = executor.onSettled(settlementFuture(source), (result) => {
    settled.resolve(result);
  });

  try {
    return await Promise.race([settled.promise, waitForTimeout(0, maxTurns)]);
  } finally {
    unsubscribe();
  }
}

async function waitForTimeout(turn: number, maxTurns: number): Promise<never> {
  if (turn >= maxTurns) {
    throw new Error(`Timed out after ${maxTurns} turns`);
  }

  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, PAUSE_DELAY_MS);
  });

  return waitForTimeout(turn + 1, maxTurns);
}

function settlementFuture<Result>(
  source: FutureKey<Result> | SettlementSource<Result>,
): FutureKey<Result> {
  return "scope" in source ? source.scope.exitFuture : source;
}

interface SettlementSource<Result> {
  readonly scope: ScopeRef<Result>;
}

interface WaitOptions {
  readonly maxTurns?: number;
}

const DEFAULT_MAX_TURNS = 10;
const PAUSE_DELAY_MS = 0;
