import { DEFAULT_QUANTUM_MS, TimeSlice } from "./time-slice";
import type { Pacer, Slice } from "@shajara/kernel";
import type { Disposer } from "@shajara/kernel/utils";
import { TaskPoster } from "./task-poster";

export class ShajaraPacer implements Pacer {
  beginSlice(): Slice {
    return new TimeSlice(this.#turnIntervalMs);
  }

  continueLater(work: () => void): Disposer {
    return this.#taskPoster.post(work);
  }

  bindTurn(flushTurn: () => void): Disposer {
    const turnInterval = globalThis.setInterval(flushTurn, this.#turnIntervalMs);

    return () => {
      globalThis.clearInterval(turnInterval);
    };
  }

  readonly #turnIntervalMs = DEFAULT_QUANTUM_MS;
  readonly #taskPoster = new TaskPoster(this.#turnIntervalMs);
}
