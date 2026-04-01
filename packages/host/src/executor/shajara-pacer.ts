import { DEFAULT_QUANTUM_MS, TimeSlice } from "./time-slice";
import type { Pacer, Slice } from "@shajara/kernel";
import type { Disposer } from "@shajara/kernel/utils";
import { TaskPoster } from "./task-poster";

export class ShajaraPacer implements Pacer {
  // oxlint-disable-next-line class-methods-use-this
  beginSlice(): Slice {
    return new TimeSlice(DEFAULT_QUANTUM_MS);
  }

  continueLater(work: () => void): Disposer {
    return this.#taskPoster.post(work);
  }

  #taskPoster = new TaskPoster();
}
