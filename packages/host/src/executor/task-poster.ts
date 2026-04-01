import type { Disposable } from "@shajara/kernel";

export class TaskPoster {
  post(work: () => void): Disposable {
    this.#queue.push(work);
    this.#channel.port2.postMessage(null);

    return {
      dispose: () => {
        const index = this.#queue.indexOf(work);
        if (index !== MISSING_INDEX) {
          this.#queue[index] = null;
        }
      },
    };
  }

  constructor() {
    this.#channel.port1.onmessage = () => {
      this.#queue.shift()?.();
    };
  }

  readonly #queue: Array<(() => void) | null> = [];
  readonly #channel = new globalThis.MessageChannel();
}

const MISSING_INDEX = -1;
