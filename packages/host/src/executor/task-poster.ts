import type { Disposer } from "@shajara/kernel/utils";

export class TaskPoster {
  post(work: () => void): Disposer {
    const task: Task = {
      canceled: false,
      work,
    };

    this.#queue.push(task);
    this.#channel.port2.postMessage(null);

    return () => {
      task.canceled = true;
    };
  }

  constructor() {
    this.#channel.port1.onmessage = () => {
      const task = this.#queue.shift();
      if (task && !task.canceled) {
        task.work();
      }
    };
  }

  readonly #queue: Task[] = [];
  readonly #channel = new globalThis.MessageChannel();
}

interface Task {
  canceled: boolean;
  work: () => void;
}
