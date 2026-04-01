import { DEFAULT_QUANTUM_MS, TimeSlice } from "./time-slice";
import type { Disposable, Pacer, Slice } from "@shajara/kernel";
import { TaskPoster } from "./task-poster";

export class ShajaraPacer implements Pacer {
  // oxlint-disable-next-line class-methods-use-this
  beginSlice(): Slice {
    return new TimeSlice(DEFAULT_QUANTUM_MS);
  }

  continueLater(work: () => void): Disposable {
    return this.#taskPoster.post(work);
  }

  #taskPoster = new TaskPoster();
}
