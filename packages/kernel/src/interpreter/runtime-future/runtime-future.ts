import type {
  FutureHandle,
  FutureKey,
  FutureResult,
  FutureSettleKey,
  KEY_TOKEN,
  Suppressor,
} from "#/contracts/index.js";
import type { Disposer } from "#/utils/index.js";

export class RuntimeFuture<Result> implements FutureKey<Result>, FutureSettleKey<Result> {
  public poll(): FutureResult<Result> | null {
    if (this.#result) {
      return this.#result;
    }

    return null;
  }

  public wait(onSettled: FutureSettler<Result>): Disposer {
    const waiter = [onSettled] as const;
    this.#waiters.add(waiter);

    return () => {
      this.#waiters.delete(waiter);
    };
  }

  public settle(result: FutureResult<Result>): FutureSettlement {
    if (this.#result) {
      return () => false;
    }

    this.#result = result;

    return (suppressor) => {
      for (const [waiter] of this.#waiters) {
        waiter(result, suppressor);
      }
      this.#waiters.clear();
      return true;
    };
  }

  public handle(): FutureHandle<Result> {
    return [this, this];
  }

  // oxlint-disable-next-line no-undef
  declare public readonly [KEY_TOKEN]: FutureKey<Result>[typeof KEY_TOKEN] &
    FutureSettleKey<Result>[typeof KEY_TOKEN];
  #waiters = new Set<readonly [FutureSettler<Result>]>();
  #result: FutureResult<Result> | null = null;
}

export type FutureSettler<Result> = (result: FutureResult<Result>, suppressor: Suppressor) => void;

export type FutureSettlement = (suppressor: Suppressor) => boolean;
