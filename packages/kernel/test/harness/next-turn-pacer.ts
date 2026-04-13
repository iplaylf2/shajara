import type { Pacer, Slice } from "#/index";
import type { Disposer } from "#/utils";

export class NextTurnPacer implements Pacer {
  public constructor() {
    this.#channel.port1.onmessage = this.#handleTurn.bind(this);
  }

  public beginSlice(): Slice {
    const deadline = now() + this.#quantumMs;
    return {
      shouldYield: () => now() >= deadline,
    };
  }

  public continueLater(work: () => void): Disposer {
    const task = [work] as const;
    this.#tasks.add(task);
    this.#ensureTurnScheduled();

    return () => {
      this.#tasks.delete(task);
      if (this.#tasks.size === 0) {
        this.#cancelScheduledTurn();
      }
    };
  }

  public async waitForQuiescence(): Promise<void> {
    await this.#waitForQuiescence(0);
  }

  public shutdown(): void {
    this.#cancelScheduledTurn();
    this.#tasks.clear();
  }

  public get faults(): readonly unknown[] {
    return this.#faults;
  }

  async #waitForQuiescence(turn: number): Promise<void> {
    if (this.#tasks.size === 0 && !this.#isScheduled) {
      return;
    }

    if (turn >= MAX_QUIESCENCE_TURNS) {
      throw new Error(`Timed out after ${MAX_QUIESCENCE_TURNS} turns`);
    }

    await new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, TURN_INTERVAL_MS);
    });

    return this.#waitForQuiescence(turn + 1);
  }

  #handleTurn(): void {
    this.#isScheduled = false;

    if (this.#tasks.size === 0) {
      return;
    }

    this.#nextTurnAt = now() + TURN_INTERVAL_MS;
    const tasks = [...this.#tasks];
    this.#tasks.clear();

    for (const [task] of tasks) {
      try {
        task();
      } catch (error) {
        this.#faults.push(error);
      }
    }

    if (this.#tasks.size > 0) {
      this.#ensureTurnScheduled();
    }
  }

  #ensureTurnScheduled(): void {
    if (this.#isScheduled) {
      return;
    }

    this.#isScheduled = true;
    const delayMs = Math.max(0, this.#nextTurnAt - now());
    if (delayMs === 0) {
      this.#postTurn();
      return;
    }

    this.#turnTimer = globalThis.setTimeout(() => {
      this.#turnTimer = null;
      this.#handleTurn();
    }, delayMs);
  }

  #cancelScheduledTurn(): void {
    if (this.#turnTimer !== null) {
      globalThis.clearTimeout(this.#turnTimer);
      this.#turnTimer = null;
    }

    this.#isScheduled = false;
  }

  #postTurn(): void {
    this.#channel.port2.postMessage(null);
  }

  #isScheduled = false;
  #nextTurnAt = 0;
  readonly #quantumMs = DEFAULT_QUANTUM_MS;
  readonly #faults: unknown[] = [];
  readonly #channel = new globalThis.MessageChannel();
  readonly #tasks = new Set<readonly [() => void]>();
  #turnTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
}

const MAX_QUIESCENCE_TURNS = 10;
const DEFAULT_QUANTUM_MS = 8;
const TURN_INTERVAL_MS = 0;

function now(): number {
  return globalThis.performance.now();
}
