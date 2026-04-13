import type { LaunchResult } from "#/index";

export async function waitForSettled<Result>(
  handle: SettlementSource<Result>,
  options?: WaitOptions,
): Promise<LaunchResult<Result>> {
  const maxTurns = options?.maxTurns ?? DEFAULT_MAX_TURNS;
  const settled = Promise.withResolvers<LaunchResult<Result>>();
  const unsubscribe = handle.onSettled((result) => {
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

interface SettlementSource<Result> {
  onSettled(listener: (result: LaunchResult<Result>) => void): () => void;
}

interface WaitOptions {
  readonly maxTurns?: number;
}

const DEFAULT_MAX_TURNS = 10;
const PAUSE_DELAY_MS = 0;
