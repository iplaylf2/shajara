import type { Executor } from "@shajara/kernel";
import { EventLoopPacer } from "./event-loop-pacer.js";
import { createExecutor } from "@shajara/kernel";

/** Owns the executor and event-loop resources shared by active top-level entries. */
export class ExecutorSession implements Disposable {
  public constructor() {
    // oxlint-disable-next-line init-declarations
    let pacer!: EventLoopPacer;
    this.executor = createExecutor((flushTurn) => {
      pacer = new EventLoopPacer(flushTurn);
      return pacer;
    });
    this.#pacer = pacer;
  }

  public [Symbol.dispose](): void {
    this.#pacer[Symbol.dispose]();
  }

  public readonly executor: Executor;
  readonly #pacer: EventLoopPacer;
}
