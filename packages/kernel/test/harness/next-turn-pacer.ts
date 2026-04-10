import type { Pacer, Slice } from "#/index";
import type { Disposer } from "#/utils";

export class NextTurnPacer implements Pacer {
  public beginSlice(): Slice {
    return this.#slice;
  }

  public continueLater(work: () => void): Disposer {
    const scheduled = {
      active: true,
      work,
    };

    this.#pendingTasks += 1;
    globalThis.setTimeout(() => {
      try {
        if (scheduled.active && this.#isRunning) {
          scheduled.work();
        }
      } finally {
        this.#pendingTasks -= 1;
        this.#flushQuiescenceWaiters();
      }
    }, TURN_DELAY_MS);

    return () => {
      scheduled.active = false;
    };
  }

  public async waitForQuiescence(): Promise<void> {
    await this.#waitForQuiescence(0);
  }

  public shutdown(): void {
    this.#isRunning = false;
  }

  async #waitForQuiescence(turn: number): Promise<void> {
    if (this.#pendingTasks === 0) {
      return;
    }

    if (turn >= MAX_QUIESCENCE_TURNS) {
      throw new Error(`Timed out after ${MAX_QUIESCENCE_TURNS} turns`);
    }

    await new Promise<void>((resolve) => {
      this.#quiescenceWaiters.push(resolve);
    });

    return this.#waitForQuiescence(turn + 1);
  }

  #flushQuiescenceWaiters(): void {
    if (this.#pendingTasks !== 0) {
      return;
    }

    const waiters = this.#quiescenceWaiters;
    this.#quiescenceWaiters = [];
    for (const waiter of waiters) {
      waiter();
    }
  }

  #isRunning = true;
  #pendingTasks = 0;
  #quiescenceWaiters: Array<() => void> = [];
  readonly #slice: Slice = {
    shouldYield: () => false,
  };
}

const MAX_QUIESCENCE_TURNS = 10;
const TURN_DELAY_MS = 0;
