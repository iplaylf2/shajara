import { DEFAULT_QUANTUM_MS, TimeSlice } from "./time-slice.js";
import type { Pacer, Slice } from "@shajara/kernel";
import type { Disposer } from "@shajara/kernel/utils";
import { TurnCoordinator } from "./turn-coordinator.js";

export class EventLoopPacer implements Pacer, Disposable {
  public constructor(flushTurn: () => void) {
    this.#turnCoordinator = new TurnCoordinator(flushTurn, this.#turnIntervalMs);
  }

  public beginSlice(): Slice {
    return new TimeSlice(this.#turnIntervalMs);
  }

  public continueLater(work: () => void): Disposer {
    return this.#turnCoordinator.post(work);
  }

  public [Symbol.dispose](): void {
    this.#turnCoordinator[Symbol.dispose]();
  }

  readonly #turnIntervalMs = DEFAULT_QUANTUM_MS;
  readonly #turnCoordinator: TurnCoordinator;
}
