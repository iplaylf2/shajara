import type {
  FutureHandle,
  FutureKey,
  FutureResult,
  FutureSettleKey,
  KEY_TOKEN,
  Suppressor,
} from "#/contracts";
import { noop, unreachable } from "#/utils";
import type { Disposer } from "#/utils";
import { option } from "fp-ts";

export class RuntimeFuture<out Result> implements FutureKey<Result>, FutureSettleKey<Result> {
  public poll(): option.Option<FutureResult<Result>> {
    if (this.#result) {
      return option.some(this.#result);
    }

    return option.none;
  }

  public wait(onSettled: FutureSettler<Result>): Disposer {
    if (this.#result) {
      return noop;
    }

    this.#waiters.add(onSettled);

    return () => {
      this.#waiters.delete(onSettled);
    };
  }

  public settle(result: FutureResult<Result>): FutureNotification {
    if (this.#result) {
      return unreachable();
    }

    this.#result = result;
    const waiters = this.#waiters;
    this.#waiters = new Set();

    return (suppressor) => {
      for (const waiter of waiters) {
        waiter(result, suppressor);
      }
    };
  }

  public handle(): FutureHandle<Result> {
    return [this, this];
  }

  // oxlint-disable-next-line no-undef
  declare public readonly [KEY_TOKEN]: FutureKey<Result>[typeof KEY_TOKEN] &
    FutureSettleKey<Result>[typeof KEY_TOKEN];
  #waiters = new Set<FutureSettler<Result>>();
  #result: FutureResult<Result> | null = null;
}

export type FutureSettler<out Result> = (
  result: FutureResult<Result>,
  suppressor: Suppressor,
) => void;

export type FutureNotification = (suppressor: Suppressor) => void;
