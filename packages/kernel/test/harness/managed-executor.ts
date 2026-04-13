import type { BindTurn, Executor } from "#/index";
import { NextTurnPacer } from "./next-turn-pacer";
import { createExecutor } from "#/index";
import { waitForSettled } from "./settlement";

export function createManagedExecutor(): ManagedExecutorHandle {
  return new ManagedExecutor();
}

export interface ManagedExecutorHandle extends AsyncDisposable {
  readonly executor: Executor;
  readonly turnFaults: readonly unknown[];
}

class ManagedExecutor implements ManagedExecutorHandle {
  public constructor() {
    try {
      this.#executor = createExecutor(this.#bindTurn);
    } catch (error) {
      this.#pacer.shutdown();
      throw error;
    }
  }

  public async [Symbol.asyncDispose](): Promise<void> {
    const existing = this.#disposePromise;
    if (existing) {
      await existing;
      return;
    }

    const dispose = this.#dispose();
    this.#disposePromise = dispose;
    await dispose;
  }

  public get executor(): Executor {
    return this.#executor;
  }

  public get turnFaults(): readonly unknown[] {
    return [...this.#pacer.faults, ...this.#flushTurnFaults];
  }

  async #dispose(): Promise<void> {
    this.#executor.cancel(this.#executor.scope);
    const settled = await waitForSettled(this.#executor);
    if (settled.kind !== "canceled") {
      throw new Error("Expected executor shutdown to settle as canceled", {
        cause: settled,
      });
    }
    this.#clearFlushTurnInterval();
    await this.#pacer.waitForQuiescence();
    this.#pacer.shutdown();
  }

  #startFlushTurnInterval(flushTurn: () => void): void {
    if (this.#flushTurnInterval !== null) {
      return;
    }

    this.#flushTurnInterval = globalThis.setInterval(() => {
      try {
        flushTurn();
      } catch (error) {
        this.#flushTurnFaults.push(error);
      }
    }, TURN_DELAY_MS);
  }

  #clearFlushTurnInterval(): void {
    if (this.#flushTurnInterval !== null) {
      globalThis.clearInterval(this.#flushTurnInterval);
      this.#flushTurnInterval = null;
    }
  }

  readonly #bindTurn: BindTurn = (flushTurn) => {
    this.#startFlushTurnInterval(flushTurn);

    return this.#pacer;
  };

  #disposePromise: Promise<void> | null = null;
  readonly #executor: Executor;
  readonly #flushTurnFaults: unknown[] = [];
  #flushTurnInterval: ReturnType<typeof globalThis.setInterval> | null = null;
  readonly #pacer = new NextTurnPacer();
}

const TURN_DELAY_MS = 0;
