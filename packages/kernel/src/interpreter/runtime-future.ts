import type { FutureHandle, FutureKey, FutureResult, FutureSettleKey } from "#/contracts";
import { io, option } from "fp-ts";
import type { Unsubscribe } from "#/interpreter-kit";

export class RuntimeFuture<out Result> {
  public poll(): option.Option<FutureResult<Result>> {
    if (this.#result) {
      return option.some(this.#result);
    }

    return option.none;
  }

  public wait(onSettled: FutureSettler<Result>): Unsubscribe {
    if (this.#result) {
      onSettled(this.#result);
      return io.Do;
    }

    this.#waiters.add(onSettled);

    return () => {
      this.#waiters.delete(onSettled);
    };
  }

  public settle(result: FutureResult<Result>): void {
    if (this.#result) {
      return;
    }

    this.#result = result;

    for (const waiter of this.#waiters) {
      waiter(result);
    }

    this.#waiters.clear();
  }

  public get handle(): FutureHandle<Result> {
    return [this.#key, this.#settleKey];
  }

  readonly #key = {} as FutureKey<Result>;
  readonly #settleKey = {} as FutureSettleKey<Result>;
  readonly #waiters = new Set<FutureSettler<Result>>();
  #result: FutureResult<Result> | null = null;
}

export type FutureSettler<out Result> = (result: FutureResult<Result>) => void;
