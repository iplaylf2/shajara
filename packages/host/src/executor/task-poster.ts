// oxlint-disable no-magic-numbers
import type { Disposer } from "@shajara/kernel/utils";

export class TaskPoster {
  public constructor(turnIntervalMs = 0) {
    this.#turnInterval = turnIntervalMs;
    this.#channel.port1.onmessage = this.#handleTurn.bind(this);
  }

  post(work: () => void): Disposer {
    this.#tasks.add(work);
    this.#ensureTurnScheduled();

    return () => {
      this.#tasks.delete(work);
      if (this.#tasks.size === 0) {
        this.#cancelScheduledTurn();
      }
    };
  }

  #handleTurn(): void {
    this.#isScheduled = false;

    if (this.#tasks.size === 0) {
      return;
    }

    this.#nextTurnAt = now() + this.#turnInterval;
    const tasks = [...this.#tasks];
    this.#tasks.clear();

    const errors: unknown[] = [];
    for (const task of tasks) {
      try {
        task();
      } catch (error) {
        errors.push(error);
      }
    }

    if (this.#tasks.size > 0) {
      this.#ensureTurnScheduled();
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, "Errors occurred while posting executor turn work");
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
      this.#postTurn();
    }, delayMs);
  }

  #cancelScheduledTurn(): void {
    if (this.#turnTimer !== null) {
      globalThis.clearTimeout(this.#turnTimer);
      this.#turnTimer = null;
      this.#isScheduled = false;
    }
  }

  #postTurn(): void {
    this.#channel.port2.postMessage(null);
  }

  #isScheduled = false;
  #nextTurnAt = 0;
  #turnTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

  readonly #turnInterval: number;
  readonly #channel = new globalThis.MessageChannel();
  readonly #tasks = new Set<() => void>();
}

function now(): number {
  return globalThis.performance.now();
}
