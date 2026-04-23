import type { Slice } from "@shajara/kernel";

export class TimeSlice implements Slice {
  public shouldYield(): boolean {
    return now() >= this.#deadline;
  }

  public constructor(quantumMs: number) {
    this.#deadline = now() + quantumMs;
  }

  readonly #deadline: number;
}

function now(): number {
  return globalThis.performance.now();
}

// Ms per synchronous slice
export const DEFAULT_QUANTUM_MS = 8;
