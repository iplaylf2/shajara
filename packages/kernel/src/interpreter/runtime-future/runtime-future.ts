import type {
  FutureHandle,
  FutureKey,
  FutureResult,
  FutureSettleKey,
  KEY_TOKEN,
  Suppressor,
} from "#/contracts";
import type { Disposer } from "#/utils/index";
import { option } from "fp-ts";
import { unreachable } from "#/utils/index";

export class RuntimeFuture<Result> implements FutureKey<Result>, FutureSettleKey<Result> {
  public poll(): option.Option<FutureResult<Result>> {
    if (this.#result) {
      return option.some(this.#result);
    }

    return option.none;
  }

  public wait(onSettled: FutureSettler<Result>): Disposer {
    if (this.#result) {
      return unreachable();
    }

    const waiter = [onSettled] as const;
    this.#waiters.add(waiter);

    return () => {
      this.#waiters.delete(waiter);
    };
  }

  public settle(result: FutureResult<Result>): FutureNotification {
    if (this.#result) {
      return () => [];
    }

    this.#result = result;

    return (suppressor) => {
      for (const [waiter] of this.#waiters) {
        waiter(result, suppressor);
      }
      this.#waiters.clear();
    };
  }

  public handle(): FutureHandle<Result> {
    return [this, this];
  }

  public get isSettled(): boolean {
    return this.#result !== null;
  }

  // oxlint-disable-next-line no-undef
  declare public readonly [KEY_TOKEN]: FutureKey<Result>[typeof KEY_TOKEN] &
    FutureSettleKey<Result>[typeof KEY_TOKEN];
  #waiters = new Set<readonly [FutureSettler<Result>]>();
  #result: FutureResult<Result> | null = null;
}

export type FutureSettler<Result> = (result: FutureResult<Result>, suppressor: Suppressor) => void;

export type FutureNotification = (suppressor: Suppressor) => void;
