import type { LaunchResult } from "#/index";

export async function waitForSettled<Result>(
  handle: SettlementSource<Result>,
  options?: WaitOptions,
): Promise<LaunchResult<Result>> {
  const maxTurns = options?.maxTurns ?? DEFAULT_MAX_TURNS;
  const state: SettlementState<Result> = {
    settled: null,
  };
  const unsubscribe = handle.onSettled((result) => {
    state.settled = result;
  });

  try {
    return await waitForTurn(0);
  } finally {
    unsubscribe();
  }

  async function waitForTurn(turn: number): Promise<LaunchResult<Result>> {
    if (state.settled !== null) {
      return state.settled;
    }

    if (turn >= maxTurns) {
      throw new Error(`Timed out after ${maxTurns} turns`);
    }

    await new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, PAUSE_DELAY_MS);
    });

    return waitForTurn(turn + 1);
  }
}

interface SettlementSource<Result> {
  onSettled(listener: (result: LaunchResult<Result>) => void): () => void;
}

interface SettlementState<Result> {
  settled: LaunchResult<Result> | null;
}

interface WaitOptions {
  readonly maxTurns?: number;
}

const DEFAULT_MAX_TURNS = 10;
const PAUSE_DELAY_MS = 0;
