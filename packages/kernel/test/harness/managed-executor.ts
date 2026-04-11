import type { Executor } from "#/index";
import { NextTurnPacer } from "./next-turn-pacer";
import { createExecutor } from "#/index";
import { waitForSettled } from "./settlement";

export function createManagedExecutor() {
  return new ManagedExecutor();
}

class ManagedExecutor implements AsyncDisposable {
  public constructor() {
    try {
      this.#executor = createExecutor(this.#pacer);
    } catch (error) {
      this.#pacer.shutdown();
      throw error;
    }
  }

  public async [Symbol.asyncDispose](): Promise<void> {
    const existing = this.#disposePromise;
    if (existing) {
      await existing;
      return;
    }

    const dispose = this.#dispose();
    this.#disposePromise = dispose;
    await dispose;
  }

  public get executor(): Executor {
    return this.#executor;
  }

  public get turnFaults(): readonly unknown[] {
    return this.#pacer.faults;
  }

  async #dispose(): Promise<void> {
    this.#executor.cancel(this.#executor.scope);
    const settled = await waitForSettled(this.#executor);
    if (settled.kind !== "canceled") {
      throw new Error("Expected executor shutdown to settle as canceled", {
        cause: settled,
      });
    }
    await this.#pacer.waitForQuiescence();
    this.#pacer.shutdown();
  }

  #disposePromise: Promise<void> | null = null;
  readonly #executor: Executor;
  readonly #pacer = new NextTurnPacer();
}
