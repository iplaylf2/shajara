import { DEFAULT_QUANTUM_MS, TimeSlice } from "./time-slice";
import type { Pacer, Slice } from "@shajara/kernel";
import { TaskPoster } from "./task-poster";
import type { Unsubscribe } from "@shajara/kernel/utils";

export class ShajaraPacer implements Pacer {
  // oxlint-disable-next-line class-methods-use-this
  beginSlice(): Slice {
    return new TimeSlice(DEFAULT_QUANTUM_MS);
  }

  continueLater(work: () => void): Unsubscribe {
    return this.#taskPoster.post(work);
  }

  #taskPoster = new TaskPoster();
}
